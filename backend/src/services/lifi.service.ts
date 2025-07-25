import {
  getChains,
  getTokens,
  getTools,
  getQuote,
  executeRoute,
  getStatus,
  ChainId,
  ChainType,
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
  CrossChainTransfer,
} from "../types";
import { ethers } from "ethers";

/**
 * LI.FI Service Class
 * Main service wrapper for LI.FI SDK integration
 */
export class LiFiService {
  private initialized: boolean = false;
  private initializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private chainsCache: Map<number, LiFiChain> = new Map();
  private tokensCache: Map<string, LiFiToken[]> = new Map();
  private toolsCache: any = null;
  private cacheTimestamps: Map<string, number> = new Map();

  constructor() {
    // Don't initialize in constructor - use lazy initialization
  }

  /**
   * Initialize the LI.FI service (lazy initialization)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializing) {
      return this.initializationPromise!;
    }

    this.initializing = true;
    this.initializationPromise = this._doInitialize();

    try {
      await this.initializationPromise;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Actual initialization logic
   */
  private async _doInitialize(): Promise<void> {
    try {
      validateLiFiConfig();
      this.initialized = true;
      console.log(
        "✅ LI.FI Service initialized successfully (lazy loading enabled)"
      );

      // Skip pre-loading to avoid hitting rate limits
      // Data will be loaded on-demand when needed
    } catch (error) {
      console.error("❌ Failed to initialize LI.FI Service:", error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Pre-load chains, tokens, and tools data
   */
  private async preloadData(): Promise<void> {
    try {
      console.log("🔄 Pre-loading LI.FI data...");

      // Load chains and tools sequentially to avoid rate limiting
      try {
        await this.loadChains();
        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.loadTools();
      } catch (error) {
        console.warn("⚠️ Failed to pre-load some LI.FI data:", error);
        // Continue without throwing - service can still function
      }

      console.log("✅ LI.FI data pre-loaded successfully");
    } catch (error) {
      console.warn("⚠️ Failed to pre-load some LI.FI data:", error);
      // Don't throw here, service can still function
    }
  }

  /**
   * Load and cache chains data
   */
  private async loadChains(): Promise<void> {
    try {
      const chains = await executeWithRateLimit(() =>
        getChains(getLiFiRequestOptions())
      );

      // Cache chains by ID
      chains.forEach((chain) => {
        this.chainsCache.set(chain.id, chain as LiFiChain);
      });

      this.cacheTimestamps.set("chains", Date.now());
      console.log(`📊 Loaded ${chains.length} chains`);
    } catch (error) {
      console.error("❌ Failed to load chains:", error);
      // Don't throw during initialization - service can still function
    }
  }

  /**
   * Load and cache tools data
   */
  private async loadTools(): Promise<void> {
    try {
      const tools = await executeWithRateLimit(() =>
        getTools(getLiFiRequestOptions())
      );

      this.toolsCache = tools;
      this.cacheTimestamps.set("tools", Date.now());

      const bridgeCount = tools.bridges?.length || 0;
      const exchangeCount = tools.exchanges?.length || 0;
      console.log(
        `🔧 Loaded ${bridgeCount} bridges and ${exchangeCount} exchanges`
      );
    } catch (error) {
      console.error("❌ Failed to load tools:", error);
      // Don't throw during initialization - service can still function
    }
  }

  /**
   * Check if service is ready
   */
  public isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get supported chains
   */
  public async getChains(): Promise<LiFiChain[]> {
    await this.ensureInitialized();

    // Check cache freshness
    const cacheAge = Date.now() - (this.cacheTimestamps.get("chains") || 0);
    if (cacheAge > lifiConfig.cacheTtl * 1000) {
      await this.loadChains();
    }

    return Array.from(this.chainsCache.values());
  }

  /**
   * Get chain by ID
   */
  public async getChainById(chainId: number): Promise<LiFiChain | null> {
    const chains = await this.getChains();
    return this.chainsCache.get(chainId) || null;
  }

  /**
   * Get tokens for a specific chain
   */
  public async getTokens(chainId: number): Promise<LiFiToken[]> {
    await this.ensureInitialized();

    const cacheKey = `tokens_${chainId}`;
    const cacheAge = Date.now() - (this.cacheTimestamps.get(cacheKey) || 0);

    // Check cache freshness
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

      console.log(
        `💰 Loaded ${chainTokens.length} tokens for chain ${chainId}`
      );
      return chainTokens as LiFiToken[];
    } catch (error) {
      console.error(`❌ Failed to load tokens for chain ${chainId}:`, error);
      throw error;
    }
  }

  /**
   * Find token by symbol on a chain
   */
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

  /**
   * Get available tools (bridges and exchanges)
   */
  public async getTools(): Promise<any> {
    await this.ensureInitialized();

    // Check cache freshness
    const cacheAge = Date.now() - (this.cacheTimestamps.get("tools") || 0);
    if (cacheAge > lifiConfig.cacheTtl * 1000) {
      await this.loadTools();
    }

    return this.toolsCache;
  }

  /**
   * Get quote for a swap/bridge transaction
   */
  public async getQuote(request: LiFiQuoteRequest): Promise<LiFiQuoteResponse> {
    await this.ensureInitialized();

    try {
      // Validate request
      await this.validateQuoteRequest(request);

      const quoteRequest = {
        fromChain: request.fromChain,
        toChain: request.toChain,
        fromToken: request.fromToken,
        toToken: request.toToken,
        fromAmount: request.fromAmount,
        fromAddress: request.fromAddress,
        toAddress: request.toAddress,
        slippage: request.slippage || lifiConfig.slippageTolerance,
        allowBridges: request.allowBridges,
        denyBridges: request.denyBridges,
        allowExchanges: request.allowExchanges,
        denyExchanges: request.denyExchanges,
        ...getLiFiRequestOptions(),
      };

      const quote = await executeWithRateLimit(() => getQuote(quoteRequest));

      console.log(
        `💱 Generated quote: ${request.fromAmount} ${request.fromToken} → ${quote.estimate.toAmount} ${request.toToken}`
      );

      return quote as LiFiQuoteResponse;
    } catch (error) {
      console.error("❌ Failed to get quote:", error);
      throw this.handleError(error, "getQuote");
    }
  }

  /**
   * Execute a route/transaction
   */
  public async executeRoute(
    route: any,
    settings?: any
  ): Promise<LiFiExecutionStatus> {
    await this.ensureInitialized();

    try {
      const executionSettings = {
        updateCallback: (updatedRoute: any) => {
          console.log(
            "🔄 Route execution update:",
            updatedRoute.steps?.[0]?.execution?.status
          );
        },
        switchChainHook: async (chainId: number) => {
          console.log(`🔄 Switching to chain ${chainId}`);
          // Custom chain switching logic can be added here
          return Promise.resolve();
        },
        acceptSlippageUpdateHook: async (slippageUpdate: any) => {
          console.log("⚠️ Slippage update required:", slippageUpdate);
          // Auto-accept reasonable slippage updates
          return slippageUpdate.slippage < 0.05; // Accept up to 5% slippage
        },
        ...settings,
      };

      const result = await executeWithRateLimit(() =>
        executeRoute(route, executionSettings)
      );

      console.log("✅ Route execution completed:", result);

      return {
        status: "DONE",
        txHash:
          (result.steps?.[0]?.execution as any)?.transactionHash || "unknown",
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
      } as LiFiExecutionStatus;
    } catch (error) {
      console.error("❌ Failed to execute route:", error);
      throw this.handleError(error, "executeRoute");
    }
  }

  /**
   * Get execution status of a transaction
   */
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
      } as LiFiExecutionStatus;
    } catch (error) {
      console.error("❌ Failed to get execution status:", error);
      throw this.handleError(error, "getExecutionStatus");
    }
  }

  /**
   * Convert amount to wei format using token decimals
   */
  public async convertAmountToWei(
    amount: string,
    tokenSymbol: string,
    chainId: number
  ): Promise<string> {
    try {
      // Get tokens for the chain
      const tokens = await this.getTokens(chainId);
      
      // Find the token by symbol
      const token = tokens.find(
        (t) => t.symbol.toLowerCase() === tokenSymbol.toLowerCase()
      );
      
      if (!token) {
        // Default to 18 decimals for unknown tokens
        console.warn(`Token ${tokenSymbol} not found on chain ${chainId}, using 18 decimals`);
        return ethers.parseUnits(amount, 18).toString();
      }
      
      // Convert amount to wei using token decimals
      const weiAmount = ethers.parseUnits(amount, token.decimals);
      return weiAmount.toString();
    } catch (error) {
      console.error(`Error converting amount to wei:`, error);
      // Fallback to 18 decimals
      return ethers.parseUnits(amount, 18).toString();
    }
  }

  /**
   * Validate quote request
   */
  private async validateQuoteRequest(request: LiFiQuoteRequest): Promise<void> {
    // Validate chains are supported
    const fromChainId =
      typeof request.fromChain === "string"
        ? parseInt(request.fromChain)
        : request.fromChain;
    const toChainId =
      typeof request.toChain === "string"
        ? parseInt(request.toChain)
        : request.toChain;

    const chains = await this.getChains();
    const fromChain = chains.find((c) => c.id === fromChainId);
    const toChain = chains.find((c) => c.id === toChainId);

    if (!fromChain) {
      throw new Error(`Unsupported source chain: ${request.fromChain}`);
    }

    if (!toChain) {
      throw new Error(`Unsupported destination chain: ${request.toChain}`);
    }

    // Validate amount
    const amount = parseFloat(request.fromAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount specified");
    }

    // Validate slippage
    if (request.slippage && (request.slippage < 0 || request.slippage > 1)) {
      throw new Error("Slippage must be between 0 and 1");
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, operation: string): Error {
    const errorMessage = error?.message || "Unknown error";
    const formattedError = new Error(
      `LI.FI ${operation} failed: ${errorMessage}`
    );

    // Add additional error context
    if (error?.response?.data) {
      console.error("LI.FI API Error Details:", error.response.data);
    }

    return formattedError;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.chainsCache.clear();
    this.tokensCache.clear();
    this.toolsCache = null;
    this.cacheTimestamps.clear();
    console.log("🧹 LI.FI Service cache cleared");
  }

  /**
   * Get service health status
   */
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

// Export singleton instance
export const lifiService = new LiFiService();
export default lifiService;
