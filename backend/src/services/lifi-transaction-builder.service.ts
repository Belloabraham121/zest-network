import { lifiService, LiFiService } from "./lifi.service";
import {
  LiFiQuoteManagerService,
  QuoteResponse,
} from "./lifi-quote-manager.service";
import { LiFiChainManager } from "./lifi-chain-manager.service";
import { LiFiTokenManager } from "./lifi-token-manager.service";
import { executeWithRateLimit } from "./lifi-rate-limiter.service";
import { logger } from "../utils/logger";
import { isChainSupported } from "../config/lifi";

export interface TransactionBuildRequest {
  quote: QuoteResponse;
  fromAddress: string;
  toAddress?: string;
  gasPrice?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  allowInfiniteApproval?: boolean;
  skipSimulation?: boolean;
  slippageTolerance?: number;
}

export interface PreparedTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId: number;
  type?: number;
}

export interface TransactionSimulation {
  success: boolean;
  gasUsed: string;
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  error?: string;
  warnings: string[];
  balanceChanges: BalanceChange[];
}

export interface BalanceChange {
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  before: string;
  after: string;
  change: string;
  changeType: "increase" | "decrease";
}

export interface GasOptimization {
  recommended: {
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    estimatedTime: number; // seconds
    cost: string;
  };
  fast: {
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    estimatedTime: number;
    cost: string;
  };
  slow: {
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    estimatedTime: number;
    cost: string;
  };
  current: {
    baseFee: string;
    priorityFee: string;
    networkCongestion: "low" | "medium" | "high";
  };
}

export interface TransactionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    balanceSufficient: boolean;
    gasEstimateValid: boolean;
    approvalRequired: boolean;
    slippageAcceptable: boolean;
    routeStillValid: boolean;
  };
}

class LiFiTransactionBuilderService {
  private lifiService: LiFiService;
  private quoteManager: LiFiQuoteManagerService;
  private chainManager: LiFiChainManager;
  private tokenManager: LiFiTokenManager;
  private gasCache: Map<string, { data: GasOptimization; timestamp: number }> =
    new Map();
  private readonly GAS_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.lifiService = lifiService;
    this.quoteManager = new LiFiQuoteManagerService();
    this.chainManager = new LiFiChainManager();
    this.tokenManager = new LiFiTokenManager();
  }

  /**
   * Build transaction from quote
   */
  async buildTransaction(
    request: TransactionBuildRequest
  ): Promise<PreparedTransaction> {
    try {
      logger.info("Building transaction", {
        fromChain: request.quote.action?.fromChainId,
        toChain: request.quote.action?.toChainId,
        tool: request.quote.tool?.name,
      });

      // Validate the build request
      await this.validateBuildRequest(request);

      // Prepare transaction parameters
      const txParams = await this.prepareTransactionParams(request);

      // Extract transaction data from the quote
      const route = request.quote;
      if (!route.transactionRequest) {
        throw new Error("Quote does not contain transaction data");
      }

      // Process and validate the built transaction
      const preparedTx = await this.processBuiltTransaction(
        route.transactionRequest,
        request
      );

      logger.info("Transaction built successfully", {
        to: preparedTx.to,
        value: preparedTx.value,
        gasLimit: preparedTx.gasLimit,
      });

      return preparedTx;
    } catch (error) {
      logger.error("Failed to build transaction", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Simulate transaction execution
   */
  async simulateTransaction(
    transaction: PreparedTransaction,
    fromAddress: string
  ): Promise<TransactionSimulation> {
    try {
      logger.info("Simulating transaction", {
        to: transaction.to,
        value: transaction.value,
        chainId: transaction.chainId,
      });

      // Use LI.FI simulation if available, otherwise use basic estimation
      const simulation = await this.performSimulation(transaction, fromAddress);

      // Analyze simulation results
      const analysis = await this.analyzeSimulation(
        simulation,
        transaction,
        fromAddress
      );

      logger.info("Transaction simulation completed", {
        success: analysis.success,
        gasUsed: analysis.gasUsed,
        warnings: analysis.warnings.length,
      });

      return analysis;
    } catch (error) {
      logger.error("Transaction simulation failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        gasUsed: "0",
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice || "0",
        totalCost: "0",
        error: error instanceof Error ? error.message : String(error),
        warnings: [],
        balanceChanges: [],
      };
    }
  }

  /**
   * Optimize gas prices for transaction
   */
  async optimizeGasPrice(chainId: number): Promise<GasOptimization> {
    try {
      const cacheKey = `gas_${chainId}`;
      const cached = this.gasCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.GAS_CACHE_TTL) {
        return cached.data;
      }

      logger.info("Optimizing gas prices", { chainId });

      // Get current network conditions
      const networkData = await this.getNetworkGasData(chainId);

      // Calculate optimized gas prices
      const optimization = await this.calculateGasOptimization(
        networkData,
        chainId
      );

      // Cache the result
      this.gasCache.set(cacheKey, {
        data: optimization,
        timestamp: Date.now(),
      });

      logger.info("Gas optimization completed", {
        chainId,
        recommended: optimization.recommended.gasPrice,
        congestion: optimization.current.networkCongestion,
      });

      return optimization;
    } catch (error) {
      logger.error("Gas optimization failed", {
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback gas prices
      return this.getFallbackGasOptimization(chainId);
    }
  }

  /**
   * Validate transaction before execution
   */
  async validateTransaction(
    transaction: PreparedTransaction,
    fromAddress: string,
    quote: QuoteResponse
  ): Promise<TransactionValidation> {
    try {
      logger.info("Validating transaction", {
        from: fromAddress,
        to: transaction.to,
        chainId: transaction.chainId,
      });

      const errors: string[] = [];
      const warnings: string[] = [];
      const checks = {
        balanceSufficient: false,
        gasEstimateValid: false,
        approvalRequired: false,
        slippageAcceptable: false,
        routeStillValid: false,
      };

      // Check balance sufficiency
      checks.balanceSufficient = await this.checkBalanceSufficiency(
        fromAddress,
        transaction,
        quote
      );
      if (!checks.balanceSufficient) {
        errors.push("Insufficient balance for transaction");
      }

      // Validate gas estimate
      checks.gasEstimateValid = await this.validateGasEstimate(transaction);
      if (!checks.gasEstimateValid) {
        warnings.push("Gas estimate may be inaccurate");
      }

      // Check if approval is required
      checks.approvalRequired = await this.checkApprovalRequired(
        fromAddress,
        transaction,
        quote
      );
      if (checks.approvalRequired) {
        warnings.push("Token approval required before execution");
      }

      // Validate slippage
      checks.slippageAcceptable = await this.validateSlippage(quote);
      if (!checks.slippageAcceptable) {
        warnings.push("High slippage detected");
      }

      // Check if route is still valid
      checks.routeStillValid = await this.validateRouteStillValid(quote);
      if (!checks.routeStillValid) {
        errors.push("Route is no longer valid, please get a new quote");
      }

      const isValid = errors.length === 0;

      logger.info("Transaction validation completed", {
        isValid,
        errors: errors.length,
        warnings: warnings.length,
      });

      return {
        isValid,
        errors,
        warnings,
        checks,
      };
    } catch (error) {
      logger.error("Transaction validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        errors: ["Validation failed"],
        warnings: [],
        checks: {
          balanceSufficient: false,
          gasEstimateValid: false,
          approvalRequired: false,
          slippageAcceptable: false,
          routeStillValid: false,
        },
      };
    }
  }

  /**
   * Estimate transaction fees
   */
  async estimateTransactionFees(
    transaction: PreparedTransaction,
    gasOptimization?: GasOptimization
  ): Promise<{
    gasLimit: string;
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    totalFee: string;
    totalFeeUSD: string;
  }> {
    try {
      const optimization =
        gasOptimization || (await this.optimizeGasPrice(transaction.chainId));

      const gasLimit = transaction.gasLimit;
      const gasPrice =
        transaction.gasPrice || optimization.recommended.gasPrice;
      const maxFeePerGas =
        transaction.maxFeePerGas || optimization.recommended.maxFeePerGas;
      const maxPriorityFeePerGas =
        transaction.maxPriorityFeePerGas ||
        optimization.recommended.maxPriorityFeePerGas;

      // Calculate total fee in wei
      const totalFeeWei = BigInt(gasLimit) * BigInt(gasPrice);
      const totalFee = totalFeeWei.toString();

      // Convert to USD (simplified - would need price oracle in production)
      const totalFeeUSD = await this.convertToUSD(
        totalFee,
        transaction.chainId
      );

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalFee,
        totalFeeUSD,
      };
    } catch (error) {
      logger.error("Fee estimation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate build request
   */
  private async validateBuildRequest(
    request: TransactionBuildRequest
  ): Promise<void> {
    if (!request.quote) {
      throw new Error("Quote is required");
    }

    if (!request.fromAddress) {
      throw new Error("From address is required");
    }

    const fromChain = request.quote.action?.fromChainId;
    if (!fromChain || !isChainSupported(fromChain)) {
      throw new Error("Unsupported source chain");
    }

    // Validate quote is still fresh
    const quoteValidation = await this.quoteManager.validateRoute(
      request.quote
    );
    if (!quoteValidation.isValid) {
      throw new Error(`Invalid quote: ${quoteValidation.errors.join(", ")}`);
    }
  }

  /**
   * Prepare transaction parameters
   */
  private async prepareTransactionParams(
    request: TransactionBuildRequest
  ): Promise<any> {
    const params: any = {
      fromAddress: request.fromAddress,
      toAddress: request.toAddress || request.fromAddress,
    };

    // Add gas parameters
    if (request.gasPrice) params.gasPrice = request.gasPrice;
    if (request.gasLimit) params.gasLimit = request.gasLimit;
    if (request.maxFeePerGas) params.maxFeePerGas = request.maxFeePerGas;
    if (request.maxPriorityFeePerGas)
      params.maxPriorityFeePerGas = request.maxPriorityFeePerGas;
    if (request.nonce !== undefined) params.nonce = request.nonce;
    if (request.allowInfiniteApproval !== undefined)
      params.allowInfiniteApproval = request.allowInfiniteApproval;
    if (request.skipSimulation !== undefined)
      params.skipSimulation = request.skipSimulation;
    if (request.slippageTolerance !== undefined)
      params.slippageTolerance = request.slippageTolerance;

    return params;
  }

  /**
   * Process built transaction
   */
  private async processBuiltTransaction(
    transaction: any,
    request: TransactionBuildRequest
  ): Promise<PreparedTransaction> {
    const chainId = request.quote.action?.fromChainId || 1;

    return {
      to: transaction.to,
      data: transaction.data,
      value: transaction.value || "0",
      gasLimit: transaction.gasLimit || transaction.gas || "21000",
      gasPrice: transaction.gasPrice,
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      nonce: transaction.nonce,
      chainId,
      type: transaction.type,
    };
  }

  /**
   * Perform transaction simulation
   */
  private async performSimulation(
    transaction: PreparedTransaction,
    fromAddress: string
  ): Promise<any> {
    // This would integrate with simulation services
    // For now, return a mock simulation
    return {
      success: true,
      gasUsed: (
        (BigInt(transaction.gasLimit) * BigInt(80)) /
        BigInt(100)
      ).toString(), // 80% of limit
      error: null,
    };
  }

  /**
   * Analyze simulation results
   */
  private async analyzeSimulation(
    simulation: any,
    transaction: PreparedTransaction,
    fromAddress: string
  ): Promise<TransactionSimulation> {
    const warnings: string[] = [];

    // Check gas usage
    const gasUsedPercent =
      (BigInt(simulation.gasUsed) * BigInt(100)) / BigInt(transaction.gasLimit);
    if (gasUsedPercent > BigInt(90)) {
      warnings.push("High gas usage - transaction may fail");
    }

    return {
      success: simulation.success,
      gasUsed: simulation.gasUsed,
      gasLimit: transaction.gasLimit,
      gasPrice: transaction.gasPrice || "0",
      totalCost: (
        BigInt(simulation.gasUsed) * BigInt(transaction.gasPrice || "0")
      ).toString(),
      error: simulation.error,
      warnings,
      balanceChanges: [], // Would be populated with actual balance changes
    };
  }

  /**
   * Get network gas data
   */
  private async getNetworkGasData(chainId: number): Promise<any> {
    // This would integrate with gas price APIs
    // For now, return mock data
    return {
      baseFee: "20000000000", // 20 gwei
      priorityFee: "2000000000", // 2 gwei
      congestion: "medium",
    };
  }

  /**
   * Calculate gas optimization
   */
  private async calculateGasOptimization(
    networkData: any,
    chainId: number
  ): Promise<GasOptimization> {
    const baseFee = BigInt(networkData.baseFee);
    const priorityFee = BigInt(networkData.priorityFee);

    // Calculate different speed options
    const slow = {
      gasPrice: (baseFee + priorityFee / BigInt(2)).toString(),
      maxFeePerGas: (baseFee * BigInt(2) + priorityFee / BigInt(2)).toString(),
      maxPriorityFeePerGas: (priorityFee / BigInt(2)).toString(),
      estimatedTime: 300, // 5 minutes
      cost: "0", // Would calculate actual cost
    };

    const recommended = {
      gasPrice: (baseFee + priorityFee).toString(),
      maxFeePerGas: (baseFee * BigInt(2) + priorityFee).toString(),
      maxPriorityFeePerGas: priorityFee.toString(),
      estimatedTime: 120, // 2 minutes
      cost: "0",
    };

    const fast = {
      gasPrice: (baseFee + priorityFee * BigInt(2)).toString(),
      maxFeePerGas: (baseFee * BigInt(2) + priorityFee * BigInt(2)).toString(),
      maxPriorityFeePerGas: (priorityFee * BigInt(2)).toString(),
      estimatedTime: 60, // 1 minute
      cost: "0",
    };

    return {
      recommended,
      fast,
      slow,
      current: {
        baseFee: networkData.baseFee,
        priorityFee: networkData.priorityFee,
        networkCongestion: networkData.congestion,
      },
    };
  }

  /**
   * Get fallback gas optimization
   */
  private getFallbackGasOptimization(chainId: number): GasOptimization {
    // Fallback gas prices for different chains
    const fallbackPrices: { [key: number]: string } = {
      1: "20000000000", // Ethereum: 20 gwei
      137: "30000000000", // Polygon: 30 gwei
      56: "5000000000", // BSC: 5 gwei
      42161: "100000000", // Arbitrum: 0.1 gwei
      10: "1000000", // Optimism: 0.001 gwei
      43114: "25000000000", // Avalanche: 25 gwei
      250: "20000000000", // Fantom: 20 gwei
      5000: "20000000000", // Mantle: 20 gwei
      5003: "20000000000", // Mantle Sepolia: 20 gwei
    };

    const basePrice = fallbackPrices[chainId] || "20000000000";
    const basePriceBigInt = BigInt(basePrice);

    return {
      recommended: {
        gasPrice: basePrice,
        maxFeePerGas: (basePriceBigInt * BigInt(2)).toString(),
        maxPriorityFeePerGas: (basePriceBigInt / BigInt(10)).toString(),
        estimatedTime: 120,
        cost: "0",
      },
      fast: {
        gasPrice: ((basePriceBigInt * BigInt(15)) / BigInt(10)).toString(),
        maxFeePerGas: (basePriceBigInt * BigInt(3)).toString(),
        maxPriorityFeePerGas: (basePriceBigInt / BigInt(5)).toString(),
        estimatedTime: 60,
        cost: "0",
      },
      slow: {
        gasPrice: ((basePriceBigInt * BigInt(8)) / BigInt(10)).toString(),
        maxFeePerGas: ((basePriceBigInt * BigInt(15)) / BigInt(10)).toString(),
        maxPriorityFeePerGas: (basePriceBigInt / BigInt(20)).toString(),
        estimatedTime: 300,
        cost: "0",
      },
      current: {
        baseFee: basePrice,
        priorityFee: (basePriceBigInt / BigInt(10)).toString(),
        networkCongestion: "medium",
      },
    };
  }

  /**
   * Check balance sufficiency
   */
  private async checkBalanceSufficiency(
    fromAddress: string,
    transaction: PreparedTransaction,
    quote: QuoteResponse
  ): Promise<boolean> {
    try {
      // This would check actual balances
      // For now, assume sufficient
      return true;
    } catch (error) {
      logger.warn("Balance check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Validate gas estimate
   */
  private async validateGasEstimate(
    transaction: PreparedTransaction
  ): Promise<boolean> {
    try {
      const gasLimit = BigInt(transaction.gasLimit);

      // Basic validation - gas limit should be reasonable
      if (gasLimit < BigInt(21000) || gasLimit > BigInt(10000000)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if approval is required
   */
  private async checkApprovalRequired(
    fromAddress: string,
    transaction: PreparedTransaction,
    quote: QuoteResponse
  ): Promise<boolean> {
    try {
      // Check if this is a token transfer (not native ETH)
      const fromToken = quote.action?.fromToken;
      if (
        !fromToken ||
        fromToken.address === "0x0000000000000000000000000000000000000000"
      ) {
        // Native token transfers don't need approval
        return false;
      }

      // For ERC20 tokens, we need to check if approval is required
      // This is especially important for fee collection tools and bridge contracts
      const spenderAddress = transaction.to;
      if (!spenderAddress) {
        return false;
      }

      logger.info("Checking token approval requirement", {
        fromAddress,
        tokenAddress: fromToken.address,
        spenderAddress,
        amount: quote.estimate.fromAmount,
      });

      // For now, assume approval is needed for ERC20 tokens
      // In a production environment, you would check the actual allowance
      // using the ERC20 contract's allowance(owner, spender) method
      return true;
    } catch (error) {
      logger.warn("Failed to check approval requirement", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Build approval transaction for ERC20 tokens
   */
  async buildApprovalTransaction(
    request: TransactionBuildRequest
  ): Promise<PreparedTransaction | null> {
    try {
      const fromToken = request.quote.action?.fromToken;
      if (
        !fromToken ||
        fromToken.address === "0x0000000000000000000000000000000000000000"
      ) {
        // No approval needed for native tokens
        return null;
      }

      const spenderAddress = request.quote.action?.fromChainId
        ? await this.getContractAddress(request.quote.action.fromChainId)
        : null;

      if (!spenderAddress) {
        logger.warn("Could not determine spender address for approval");
        return null;
      }

      // ERC20 approve function signature: approve(address spender, uint256 amount)
      const approveData = this.encodeApprovalData(
        spenderAddress,
        request.quote.estimate.fromAmount
      );

      const approvalTransaction: PreparedTransaction = {
        to: fromToken.address,
        data: approveData,
        value: "0",
        chainId: request.quote.action?.fromChainId || 1,
        gasLimit: "100000", // Standard gas limit for ERC20 approval
        gasPrice: request.gasPrice || "0",
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        nonce: request.nonce,
      };

      logger.info("Built approval transaction", {
        tokenAddress: fromToken.address,
        spenderAddress,
        amount: request.quote.estimate.fromAmount,
      });

      return approvalTransaction;
    } catch (error) {
      logger.error("Failed to build approval transaction", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Encode ERC20 approval data
   */
  private encodeApprovalData(spenderAddress: string, amount: string): string {
    // ERC20 approve function signature: approve(address,uint256)
    const functionSignature = "0x095ea7b3";

    // Pad spender address to 32 bytes
    const paddedSpender = spenderAddress.replace("0x", "").padStart(64, "0");

    // Convert amount to hex and pad to 32 bytes
    const amountBigInt = BigInt(amount);
    const paddedAmount = amountBigInt.toString(16).padStart(64, "0");

    return functionSignature + paddedSpender + paddedAmount;
  }

  /**
   * Get contract address for the given chain
   */
  private async getContractAddress(chainId: number): Promise<string | null> {
    try {
      // This would typically get the LiFi contract address for the specific chain
      // For now, return a placeholder - in production, this should be fetched from LiFi SDK
      const contractAddresses: { [key: number]: string } = {
        1: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Ethereum
        137: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Polygon
        42161: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Arbitrum
        10: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Optimism
        8453: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Base
        5000: "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE", // Mantle
      };

      return contractAddresses[chainId] || null;
    } catch (error) {
      logger.error("Failed to get contract address", {
        chainId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Validate slippage
   */
  private async validateSlippage(quote: QuoteResponse): Promise<boolean> {
    try {
      if (!quote.estimate.toAmount || !quote.estimate.toAmountMin) {
        return true; // Can't validate without amounts
      }

      const toAmount = parseFloat(quote.estimate.toAmount);
      const toAmountMin = parseFloat(quote.estimate.toAmountMin);
      const slippage = (toAmount - toAmountMin) / toAmount;

      // Consider slippage acceptable if less than 5%
      return slippage <= 0.05;
    } catch (error) {
      return true; // Assume acceptable if can't calculate
    }
  }

  /**
   * Validate route is still valid
   */
  private async validateRouteStillValid(
    quote: QuoteResponse
  ): Promise<boolean> {
    try {
      // Check if quote is too old (more than 2 minutes)
      const quoteAge = Date.now() - (quote as any).timestamp || 0;
      return quoteAge < 120000; // 2 minutes
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert wei to USD
   */
  private async convertToUSD(
    weiAmount: string,
    chainId: number
  ): Promise<string> {
    try {
      // This would use a price oracle
      // For now, return a mock value
      return "0.00";
    } catch (error) {
      return "0.00";
    }
  }

  /**
   * Clear gas cache
   */
  clearGasCache(): void {
    this.gasCache.clear();
    logger.info("Gas cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { gasCache: number } {
    return {
      gasCache: this.gasCache.size,
    };
  }
}

export { LiFiTransactionBuilderService };
export const lifiTransactionBuilder = new LiFiTransactionBuilderService();
