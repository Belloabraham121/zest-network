import {
  getChains,
  getTokens,
  getTools,
  getQuote,
  executeRoute,
  getStatus,
  getStepTransaction,
  createConfig,
  ChainId,
  ChainType,
  EVM,
} from "@lifi/sdk";
import {
  lifiConfig,
  validateLiFiConfig,
  getLiFiRequestOptions,
  SupportedChain,
} from "../config/lifi";
import { executeWithRateLimit } from "./lifi-rate-limiter.service";
import {
  LiFiQuoteRequest,
  LiFiQuoteResponse,
  LiFiChain,
  LiFiToken,
  LiFiExecutionStatus,
} from "../types";
import { ethers } from "ethers";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  mantle,
} from "viem/chains";
import { walletService } from "./wallet.service";
import { env } from "../config/env";

export class LiFiService {
  private initialized = false;
  private initializing = false;
  private initializationPromise: Promise<void> | null = null;
  private chainsCache: Map<number, LiFiChain> = new Map();
  private tokensCache: Map<string, LiFiToken[]> = new Map();
  private toolsCache: any = null;
  private cacheTimestamps: Map<string, number> = new Map();
  private currentUserAddress: string | null = null;

  // ERC20 ABI for allowance and approve functions
  private readonly ERC20_ABI = [
    {
      name: "allowance",
      inputs: [
        { internalType: "address", name: "owner", type: "address" },
        { internalType: "address", name: "spender", type: "address" },
      ],
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      name: "approve",
      inputs: [
        { internalType: "address", name: "spender", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
      ],
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  constructor() {}

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) return this.initializationPromise!;
    this.initializing = true;
    this.initializationPromise = this._doInitialize();

    try {
      await this.initializationPromise;
    } finally {
      this.initializing = false;
    }
  }

  private async _doInitialize(): Promise<void> {
    try {
      validateLiFiConfig();
      const chains = [mainnet, arbitrum, optimism, polygon, base, mantle];

      createConfig({
        integrator: lifiConfig.integrator,
        apiKey: lifiConfig.apiKey,
        apiUrl: lifiConfig.apiUrl,
        providers: [
          EVM({
            getWalletClient: async (chainId?: number) => {
              if (!this.currentUserAddress) {
                throw new Error(
                  "User address is required to create wallet client"
                );
              }



              const userPrivateKey =
                await walletService.getDecryptedPrivateKeyByAddress(
                  this.currentUserAddress
                );
              if (!userPrivateKey) {
                throw new Error(
                  `No private key found for address: ${this.currentUserAddress}`
                );
              }

              const privateKey = userPrivateKey as `0x${string}`;
              const account = privateKeyToAccount(privateKey);



              return createWalletClient({
                account,
                chain: chainId
                  ? chains.find((c) => c.id === chainId) || mantle
                  : mantle,
                transport: http(),
              });
            },
            switchChain: async (chainId: number, userAddress?: string) => {
              const targetChain = chains.find((chain) => chain.id === chainId);
              if (!targetChain)
                throw new Error(`Unsupported chain ID: ${chainId}`);
              if (!userAddress)
                throw new Error("User address is required to switch chains");

              const userPrivateKey =
                await walletService.getDecryptedPrivateKeyByAddress(
                  userAddress
                );
              if (!userPrivateKey) {
                throw new Error(
                  `No private key found for address: ${userAddress}`
                );
              }

              const privateKey = userPrivateKey as `0x${string}`;
              const account = privateKeyToAccount(privateKey);

              return createWalletClient({
                account,
                chain: targetChain,
                transport: http(),
              });
            },
          }),
        ],
      });

      this.initialized = true;
      console.log(
        "✅ LI.FI Service initialized successfully (no relayer fallback)"
      );
      this.warmupCache();
    } catch (error) {
      console.error("❌ Failed to initialize LI.FI Service:", error);
      this.initialized = false;
      throw error;
    }
  }

  private async loadChains(): Promise<void> {
    try {
      const chains = await executeWithRateLimit(() =>
        getChains(getLiFiRequestOptions())
      );
      chains.forEach((chain) =>
        this.chainsCache.set(chain.id, chain as LiFiChain)
      );
      this.cacheTimestamps.set("chains", Date.now());
    } catch (error) {
      console.error("❌ Failed to load chains:", error);
    }
  }

  private async loadTools(): Promise<void> {
    try {
      const tools = await executeWithRateLimit(() =>
        getTools(getLiFiRequestOptions())
      );
      this.toolsCache = tools;
      this.cacheTimestamps.set("tools", Date.now());
    } catch (error) {
      console.error("❌ Failed to load tools:", error);
    }
  }

  public isReady(): boolean {
    return this.initialized;
  }

  public async getChains(): Promise<LiFiChain[]> {
    await this.ensureInitialized();
    const cacheAge = Date.now() - (this.cacheTimestamps.get("chains") || 0);
    if (cacheAge > lifiConfig.cacheTtl * 1000) await this.loadChains();
    return Array.from(this.chainsCache.values());
  }

  public async getChainById(chainId: number): Promise<LiFiChain | null> {
    const chains = await this.getChains();
    return this.chainsCache.get(chainId) || null;
  }

  public async getTokens(chainId: number): Promise<LiFiToken[]> {
    await this.ensureInitialized();
    const cacheKey = `tokens_${chainId}`;
    const cacheAge = Date.now() - (this.cacheTimestamps.get(cacheKey) || 0);

    if (
      cacheAge < lifiConfig.cacheTtl * 1000 &&
      this.tokensCache.has(cacheKey)
    ) {
      return this.tokensCache.get(cacheKey) || [];
    }

    try {
      const tokens = await executeWithRateLimit(() =>
        getTokens({ chains: [chainId], ...getLiFiRequestOptions() })
      );
      const chainTokens = tokens.tokens[chainId] || [];
      this.tokensCache.set(cacheKey, chainTokens as LiFiToken[]);
      this.cacheTimestamps.set(cacheKey, Date.now());
      return chainTokens as LiFiToken[];
    } catch (error) {
      console.error(`❌ Failed to load tokens for chain ${chainId}:`, error);
      throw error;
    }
  }

  public async findToken(
    chainId: number,
    symbol: string
  ): Promise<LiFiToken | null> {
    const tokens = await this.getTokens(chainId);
    return (
      tokens.find(
        (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
      ) || null
    );
  }

  public async getTools(): Promise<any> {
    await this.ensureInitialized();
    const cacheAge = Date.now() - (this.cacheTimestamps.get("tools") || 0);
    if (cacheAge > lifiConfig.cacheTtl * 1000) await this.loadTools();
    return this.toolsCache;
  }

  public async getQuote(request: LiFiQuoteRequest): Promise<LiFiQuoteResponse> {
    await this.ensureInitialized();
    await this.validateQuoteRequest(request);

    try {
      // Set user address for quote generation to use user's private key
      if (request.fromAddress) {
        this.currentUserAddress = request.fromAddress;

      }



      const quote = await executeWithRateLimit(() =>
        getQuote({ ...request, ...getLiFiRequestOptions() })
      );
      return quote as LiFiQuoteResponse;
    } catch (error) {
      console.error("❌ Failed to get quote:", error);
      throw this.handleError(error, "getQuote");
    } finally {
      // Clear user address after quote generation
      this.currentUserAddress = null;
    }
  }

  public async executeRoute(
    route: any,
    settings?: any
  ): Promise<LiFiExecutionStatus> {
    await this.ensureInitialized();

    try {
      if (!route || !Array.isArray(route.steps) || route.steps.length === 0) {
        throw new Error("Route must contain valid steps array for execution");
      }

      this.currentUserAddress = route.fromAddress;



      // Handle approvals for each step that requires them
      for (const step of route.steps) {
        await this.handleStepApproval(step, route.fromAddress);
      }

      const result = await executeWithRateLimit(() =>
        executeRoute(route, {
          ...settings,
          disableMessageSigning: settings?.disableMessageSigning ?? false,
          updateCallback: (updatedRoute: any) => {
            console.log(
              "🔄 Route execution update:",
              updatedRoute.steps?.[0]?.execution?.status
            );
          },
          updateTransactionRequestHook: async (txRequest: any) => {

            return txRequest;
          },
          switchChainHook: async (chainId: number) => {
            const supportedChains = [
              mainnet,
              polygon,
              arbitrum,
              optimism,
              base,
              mantle,
            ];
            const targetChain = supportedChains.find(
              (chain) => chain.id === chainId
            );
            if (!targetChain)
              throw new Error(`Unsupported chain ID: ${chainId}`);

            if (!this.currentUserAddress) {
              throw new Error("User address is required for chain switching");
            }

            const userPrivateKey =
              await walletService.getDecryptedPrivateKeyByAddress(
                this.currentUserAddress
              );
            if (!userPrivateKey) {
              throw new Error(
                `No private key found for address: ${this.currentUserAddress}`
              );
            }

            const account = privateKeyToAccount(
              userPrivateKey as `0x${string}`
            );
            return createWalletClient({
              account,
              chain: targetChain,
              transport: http(),
            });
          },
          acceptSlippageUpdateHook: async (slippageUpdate: any) =>
            slippageUpdate.slippage < 0.05,
        })
      );

      return {
        status: "DONE",
        txHash: result.steps?.[0]?.execution?.process?.[0]?.txHash || "unknown",
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
      };
    } catch (error) {
      console.error("❌ Failed to execute route:", error);

      // Enhanced error logging for approval-related issues
      if (error instanceof Error && error.message.includes("approval")) {
        console.error("❌ Approval-related error detected:", {
          message: error.message,
          fromToken: route.action?.fromToken,
          fromAddress: route.fromAddress,
        });
      }

      throw this.handleError(error, "executeRoute");
    } finally {
      this.currentUserAddress = null;
    }
  }

  /**
   * Handle approval for a specific step if needed
   */
  private async handleStepApproval(
    step: any,
    fromAddress: string
  ): Promise<void> {
    try {
      const approvalAddress = step.estimate?.approvalAddress;
      const fromToken = step.action?.fromToken;



      // For fee collection steps with native tokens, skip approval as they don't need ERC20 approval
      if (step.tool === "feeCollection") {


        // Fee collection steps with native tokens don't require approval
        if (
          !fromToken ||
          fromToken.address === "0x0000000000000000000000000000000000000000"
        ) {

          return;
        }

        // For ERC20 tokens in fee collection, continue with regular approval logic below
      }

      // Handle regular ERC20 token approvals
      if (
        !approvalAddress ||
        !fromToken ||
        fromToken.address === "0x0000000000000000000000000000000000000000" ||
        fromToken.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // No approval needed for native tokens without fee collection
        return;
      }



      // Check current allowance
      const currentAllowance = await this.checkAllowance(
        fromToken.address,
        fromAddress,
        approvalAddress,
        step.action.fromChainId
      );

      const requiredAmount = BigInt(step.estimate.fromAmount);

      if (currentAllowance < requiredAmount) {


        await this.createApprovalTransaction(
          fromToken.address,
          fromAddress,
          approvalAddress,
          step.estimate.fromAmount,
          step.action.fromChainId
        );
      }
    } catch (error) {
      console.error("❌ Error handling step approval:", error);
      // Don't throw here, let the main execution handle the approval error
    }
  }

  /**
   * Check ERC20 token allowance
   */
  private async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    chainId: number
  ): Promise<bigint> {
    try {
      const provider = this.getProviderForChain(chainId);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        this.ERC20_ABI,
        provider
      );

      const allowance = await tokenContract.allowance(
        ownerAddress,
        spenderAddress
      );
      return BigInt(allowance.toString());
    } catch (error) {
      console.error("❌ Error checking allowance:", error);
      return BigInt(0);
    }
  }

  /**
   * Create and send approval transaction
   */
  private async createApprovalTransaction(
    tokenAddress: string,
    fromAddress: string,
    spenderAddress: string,
    amount: string,
    chainId: number
  ): Promise<void> {
    try {
      const userPrivateKey =
        await walletService.getDecryptedPrivateKeyByAddress(fromAddress);
      if (!userPrivateKey) {
        throw new Error(`No private key found for address: ${fromAddress}`);
      }

      const provider = this.getProviderForChain(chainId);
      const wallet = new ethers.Wallet(userPrivateKey, provider);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        this.ERC20_ABI,
        wallet
      );



      const tx = await tokenContract.approve(spenderAddress, amount);


      const receipt = await tx.wait();

    } catch (error) {
      console.error("❌ Error creating approval transaction:", error);
      throw error;
    }
  }

  /**
   * Get provider for specific chain
   */
  private getProviderForChain(chainId: number): ethers.JsonRpcProvider {
    const rpcUrls: { [key: number]: string } = {
      1: "https://eth.llamarpc.com",
      137: "https://polygon.llamarpc.com",
      42161: "https://arbitrum.llamarpc.com",
      10: "https://optimism.llamarpc.com",
      8453: "https://base.llamarpc.com",
      5000: "https://rpc.mantle.xyz",
    };

    const rpcUrl = rpcUrls[chainId];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ID: ${chainId}`);
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }

  public async getExecutionStatus(
    txHash: string,
    bridge?: string
  ): Promise<LiFiExecutionStatus> {
    await this.ensureInitialized();

    try {
      const status = await executeWithRateLimit(() =>
        getStatus({ txHash, bridge, ...getLiFiRequestOptions() })
      );

      return {
        status: status.status || "UNKNOWN",
        substatus: status.substatus,
        substatusMessage: status.substatusMessage,
        txHash: (status as any).sending?.txHash || txHash,
        txLink: (status as any).sending?.txLink,
        fromAmount: (status as any).sending?.amount,
        toAmount: (status as any).receiving?.amount,
        gasUsed: (status as any).sending?.gasUsed,
        gasPrice: (status as any).sending?.gasPrice,
        timestamp: (status as any).sending?.timestamp,
      };
    } catch (error) {
      console.error("❌ Failed to get execution status:", error);
      throw this.handleError(error, "getExecutionStatus");
    }
  }

  public async convertAmountToWei(
    amount: string,
    tokenSymbol: string,
    chainId: number
  ): Promise<string> {
    try {
      const { getTokenConfig } = await import("../config/tokens");
      const localToken = getTokenConfig(tokenSymbol);
      if (localToken) {
        return ethers.parseUnits(amount, localToken.decimals).toString();
      }

      const tokens = await this.getTokens(chainId);
      const token = tokens.find(
        (t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
      );
      const decimals = token?.decimals ?? 18;
      return ethers.parseUnits(amount, decimals).toString();
    } catch (error) {
      return ethers.parseUnits(amount, 18).toString();
    }
  }

  private async validateQuoteRequest(request: LiFiQuoteRequest): Promise<void> {
    const fromChainId =
      typeof request.fromChain === "string"
        ? parseInt(request.fromChain)
        : request.fromChain;
    const toChainId =
      typeof request.toChain === "string"
        ? parseInt(request.toChain)
        : request.toChain;

    const chains = await this.getChains();
    if (!chains.find((c) => c.id === fromChainId)) {
      throw new Error(`Unsupported source chain: ${request.fromChain}`);
    }
    if (!chains.find((c) => c.id === toChainId)) {
      throw new Error(`Unsupported destination chain: ${request.toChain}`);
    }

    const amount = parseFloat(request.fromAmount);
    if (isNaN(amount) || amount <= 0)
      throw new Error("Invalid amount specified");

    if (request.slippage && (request.slippage < 0 || request.slippage > 1)) {
      throw new Error("Slippage must be between 0 and 1");
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.initialize();
  }

  private handleError(error: any, operation: string): Error {
    const errorMessage = error?.message || "Unknown error";
    const formattedError = new Error(
      `LI.FI ${operation} failed: ${errorMessage}`
    );
    if (error?.response?.data)
      console.error("LI.FI API Error Details:", error.response.data);
    return formattedError;
  }

  public async warmupCache(): Promise<void> {
    if (!this.initialized) return;
    setTimeout(async () => {
      try {
        await this.loadChains();
        await new Promise((r) => setTimeout(r, 1000));
        await this.loadTools();
      } catch (e) {
        console.warn("⚠️ Cache warmup failed:", e);
      }
    }, 3000);
  }

  public clearCache(): void {
    this.chainsCache.clear();
    this.tokensCache.clear();
    this.toolsCache = null;
    this.cacheTimestamps.clear();
  }

  public getHealthStatus() {
    return {
      initialized: this.initialized,
      chainsLoaded: this.chainsCache.size > 0,
      toolsLoaded: this.toolsCache !== null,
      cacheEntries: {
        chains: this.chainsCache.size,
        tokens: this.tokensCache.size,
        tools: this.toolsCache ? 1 : 0,
      },
      lastUpdated: {
        chains: this.cacheTimestamps.get("chains"),
        tools: this.cacheTimestamps.get("tools"),
      },
    };
  }
}

export const lifiService = new LiFiService();
export default lifiService;
