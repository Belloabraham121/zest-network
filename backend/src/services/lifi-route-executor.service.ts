import { lifiService, LiFiService } from "./lifi.service";
import {
  LiFiQuoteManagerService,
  QuoteResponse,
} from "./lifi-quote-manager.service";
import { LiFiChainManager } from "./lifi-chain-manager.service";
import { LiFiToolsProvider } from "./lifi-tools-provider.service";
import { executeWithRateLimit } from "./lifi-rate-limiter.service";
import { logger } from "../utils/logger";

export interface ExecutionRequest {
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
}

export interface ExecutionResult {
  transactionHash: string;
  status: "pending" | "success" | "failed" | "cancelled";
  fromChain: number;
  toChain: number;
  fromAmount: string;
  toAmount?: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: number;
  steps: ExecutionStep[];
  error?: string;
}

export interface ExecutionStep {
  id: string;
  type: "swap" | "bridge" | "approval";
  status: "pending" | "success" | "failed";
  transactionHash?: string;
  chainId: number;
  tool: string;
  fromToken: any;
  toToken: any;
  fromAmount: string;
  toAmount?: string;
  gasUsed?: string;
  timestamp: number;
  error?: string;
}

export interface ExecutionStatus {
  id: string;
  status: "pending" | "success" | "failed" | "cancelled";
  substatus?: string;
  substatusMessage?: string;
  fromChain: number;
  toChain: number;
  tool: string;
  steps: ExecutionStep[];
  receiving?: {
    txHash?: string;
    amount?: string;
    token?: any;
    chainId?: number;
  };
  gasUsed?: string;
  gasPrice?: string;
  timestamp: number;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  retryableErrors: string[];
}

export interface FallbackRoute {
  quote: QuoteResponse;
  priority: number;
  reason: string;
}

class LiFiRouteExecutorService {
  private lifiService: LiFiService;
  private quoteManager: LiFiQuoteManagerService;
  private chainManager: LiFiChainManager;
  private toolsProvider: LiFiToolsProvider;
  private executionHistory: Map<string, ExecutionResult> = new Map();
  private activeExecutions: Map<string, ExecutionStatus> = new Map();
  private readonly MAX_HISTORY_SIZE = 1000;

  constructor() {
    this.lifiService = lifiService;
    this.quoteManager = new LiFiQuoteManagerService();
    this.chainManager = new LiFiChainManager();
    this.toolsProvider = new LiFiToolsProvider();
  }

  /**
   * Execute a route with comprehensive error handling and monitoring
   */
  async executeRoute(request: ExecutionRequest): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();

    try {
      logger.info("Starting route execution", {
        executionId,
        fromChain: request.quote.action?.fromChainId,
        toChain: request.quote.action?.toChainId,
        tool: request.quote.tool?.name,
      });

      // Validate execution request
      await this.validateExecutionRequest(request);

      // Prepare execution parameters
      const executionParams = await this.prepareExecution(request);

      // Initialize execution tracking
      const execution: ExecutionResult = {
        transactionHash: "",
        status: "pending",
        fromChain: request.quote.action?.fromChainId || 0,
        toChain: request.quote.action?.toChainId || 0,
        fromAmount: request.quote.estimate.fromAmount,
        gasUsed: undefined,
        gasPrice: request.gasPrice,
        timestamp: Date.now(),
        steps: [],
      };

      // Execute with rate limiting
      const result = await executeWithRateLimit(async () => {
        return await this.lifiService.executeRoute(
          request.quote,
          executionParams
        );
      });

      if (!result) {
        throw new Error("Route execution failed - no result returned");
      }

      // Update execution with result
      execution.transactionHash =
        (result as any).transactionHash || (result as any).txHash || "";
      execution.status = "pending";

      // Store execution for monitoring
      this.executionHistory.set(executionId, execution);

      // Start monitoring the execution
      this.monitorExecution(executionId, execution);

      logger.info("Route execution initiated", {
        executionId,
        transactionHash: execution.transactionHash,
      });

      return execution;
    } catch (error) {
      logger.error("Route execution failed", {
        executionId,
        error: error instanceof Error ? error.message : String(error),
      });

      const failedExecution: ExecutionResult = {
        transactionHash: "",
        status: "failed",
        fromChain: request.quote.action?.fromChainId || 0,
        toChain: request.quote.action?.toChainId || 0,
        fromAmount: request.quote.estimate.fromAmount,
        timestamp: Date.now(),
        steps: [],
        error: error instanceof Error ? error.message : String(error),
      };

      this.executionHistory.set(executionId, failedExecution);
      return failedExecution;
    }
  }

  /**
   * Execute route with fallback mechanisms
   */
  async executeRouteWithFallback(
    request: ExecutionRequest,
    fallbackRoutes?: FallbackRoute[]
  ): Promise<ExecutionResult> {
    try {
      // Try primary route
      const result = await this.executeRoute(request);

      if (result.status !== "failed") {
        return result;
      }

      // If primary route failed and we have fallbacks, try them
      if (fallbackRoutes && fallbackRoutes.length > 0) {
        logger.info("Primary route failed, trying fallback routes", {
          fallbackCount: fallbackRoutes.length,
        });

        // Sort fallbacks by priority
        const sortedFallbacks = fallbackRoutes.sort(
          (a, b) => b.priority - a.priority
        );

        for (const fallback of sortedFallbacks) {
          try {
            logger.info("Trying fallback route", {
              tool: fallback.quote.tool?.name,
              reason: fallback.reason,
            });

            const fallbackRequest = { ...request, quote: fallback.quote };
            const fallbackResult = await this.executeRoute(fallbackRequest);

            if (fallbackResult.status !== "failed") {
              logger.info("Fallback route succeeded", {
                tool: fallback.quote.tool?.name,
              });
              return fallbackResult;
            }
          } catch (error) {
            logger.warn("Fallback route failed", {
              tool: fallback.quote.tool?.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      return result;
    } catch (error) {
      logger.error("Route execution with fallback failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(
    executionId: string
  ): Promise<ExecutionStatus | null> {
    const execution = this.executionHistory.get(executionId);

    if (!execution) {
      return null;
    }

    // If execution is still pending, get latest status from LI.FI
    if (execution.status === "pending" && execution.transactionHash) {
      try {
        const status = await executeWithRateLimit(async () => {
          return await this.lifiService.getExecutionStatus(
            execution.transactionHash
          );
        });

        if (status) {
          // Update execution with latest status
          const updatedExecution = this.updateExecutionFromStatus(
            execution,
            status
          );
          this.executionHistory.set(executionId, updatedExecution);

          return this.convertToExecutionStatus(
            executionId,
            updatedExecution,
            status
          );
        }
      } catch (error) {
        logger.warn("Failed to get execution status", {
          executionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return this.convertToExecutionStatus(executionId, execution);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit: number = 50): ExecutionResult[] {
    const executions = Array.from(this.executionHistory.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return executions;
  }

  /**
   * Cancel execution (if possible)
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executionHistory.get(executionId);

    if (!execution || execution.status !== "pending") {
      return false;
    }

    try {
      // Mark as cancelled
      execution.status = "cancelled";
      this.executionHistory.set(executionId, execution);

      logger.info("Execution cancelled", { executionId });
      return true;
    } catch (error) {
      logger.error("Failed to cancel execution", {
        executionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Retry failed execution
   */
  async retryExecution(
    executionId: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<ExecutionResult> {
    const execution = this.executionHistory.get(executionId);

    if (!execution) {
      throw new Error("Execution not found");
    }

    if (execution.status !== "failed") {
      throw new Error("Can only retry failed executions");
    }

    const config: RetryConfig = {
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
      retryableErrors: ["network", "timeout", "gas", "nonce"],
      ...retryConfig,
    };

    // Check if error is retryable
    if (
      execution.error &&
      !this.isRetryableError(execution.error, config.retryableErrors)
    ) {
      throw new Error("Execution error is not retryable");
    }

    logger.info("Retrying execution", { executionId });

    // Create new execution request (would need original request data)
    // For now, throw error as we need to store original request
    throw new Error(
      "Retry functionality requires storing original request data"
    );
  }

  /**
   * Generate fallback routes for a failed execution
   */
  async generateFallbackRoutes(
    originalRequest: ExecutionRequest,
    maxFallbacks: number = 3
  ): Promise<FallbackRoute[]> {
    try {
      const fallbacks: FallbackRoute[] = [];

      // Get alternative quotes
      const comparison = await this.quoteManager.getQuoteComparison(
        {
          fromChain: originalRequest.quote.action?.fromChainId || 0,
          toChain: originalRequest.quote.action?.toChainId || 0,
          fromToken: originalRequest.quote.action?.fromToken?.address || "",
          toToken: originalRequest.quote.action?.toToken?.address || "",
          fromAmount: originalRequest.quote.estimate.fromAmount,
          fromAddress: originalRequest.fromAddress,
          toAddress: originalRequest.toAddress,
        },
        {
          includeAlternativeRoutes: true,
          maxQuotes: maxFallbacks + 1,
        }
      );

      // Filter out the original quote and create fallback routes
      const alternativeQuotes = comparison.quotes.filter(
        (quote) => quote.tool?.name !== originalRequest.quote.tool?.name
      );

      alternativeQuotes.slice(0, maxFallbacks).forEach((quote, index) => {
        fallbacks.push({
          quote,
          priority: maxFallbacks - index,
          reason: `Alternative ${quote.tool?.name || "unknown"} route`,
        });
      });

      return fallbacks;
    } catch (error) {
      logger.error("Failed to generate fallback routes", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2,
      maxRetryDelay: 30000,
      retryableErrors: [
        "network error",
        "timeout",
        "gas price too low",
        "nonce too low",
        "replacement transaction underpriced",
        "insufficient funds for gas",
      ],
    };
  }

  /**
   * Validate execution request
   */
  private async validateExecutionRequest(
    request: ExecutionRequest
  ): Promise<void> {
    if (!request.quote) {
      throw new Error("Quote is required for execution");
    }

    if (!request.fromAddress) {
      throw new Error("From address is required");
    }

    // Validate quote
    const validation = await this.quoteManager.validateRoute(request.quote);
    if (!validation.isValid) {
      throw new Error(`Invalid route: ${validation.errors.join(", ")}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      logger.warn("Route validation warnings", {
        warnings: validation.warnings,
      });
    }
  }

  /**
   * Prepare execution parameters
   */
  private async prepareExecution(request: ExecutionRequest): Promise<any> {
    const params: any = {
      fromAddress: request.fromAddress,
      toAddress: request.toAddress || request.fromAddress,
    };

    // Add gas parameters if provided
    if (request.gasPrice) {
      params.gasPrice = request.gasPrice;
    }

    if (request.gasLimit) {
      params.gasLimit = request.gasLimit;
    }

    if (request.maxFeePerGas) {
      params.maxFeePerGas = request.maxFeePerGas;
    }

    if (request.maxPriorityFeePerGas) {
      params.maxPriorityFeePerGas = request.maxPriorityFeePerGas;
    }

    if (request.nonce !== undefined) {
      params.nonce = request.nonce;
    }

    if (request.allowInfiniteApproval !== undefined) {
      params.allowInfiniteApproval = request.allowInfiniteApproval;
    }

    if (request.skipSimulation !== undefined) {
      params.skipSimulation = request.skipSimulation;
    }

    return params;
  }

  /**
   * Monitor execution progress
   */
  private async monitorExecution(
    executionId: string,
    execution: ExecutionResult
  ): Promise<void> {
    if (!execution.transactionHash) {
      return;
    }

    const maxMonitoringTime = 30 * 60 * 1000; // 30 minutes
    const checkInterval = 10000; // 10 seconds
    const startTime = Date.now();

    const monitor = async () => {
      try {
        if (Date.now() - startTime > maxMonitoringTime) {
          logger.warn("Execution monitoring timeout", { executionId });
          return;
        }

        const currentExecution = this.executionHistory.get(executionId);
        if (!currentExecution || currentExecution.status !== "pending") {
          return;
        }

        const status = await this.lifiService.getExecutionStatus(
          execution.transactionHash
        );
        if (status) {
          const updatedExecution = this.updateExecutionFromStatus(
            currentExecution,
            status
          );
          this.executionHistory.set(executionId, updatedExecution);

          if (
            updatedExecution.status === "success" ||
            updatedExecution.status === "failed"
          ) {
            logger.info("Execution completed", {
              executionId,
              status: updatedExecution.status,
            });
            return;
          }
        }

        // Continue monitoring
        setTimeout(monitor, checkInterval);
      } catch (error) {
        logger.error("Error monitoring execution", {
          executionId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Continue monitoring despite errors
        setTimeout(monitor, checkInterval);
      }
    };

    // Start monitoring
    setTimeout(monitor, checkInterval);
  }

  /**
   * Update execution from status response
   */
  private updateExecutionFromStatus(
    execution: ExecutionResult,
    status: any
  ): ExecutionResult {
    const updated = { ...execution };

    // Update status
    if (status.status === "DONE") {
      updated.status = "success";
    } else if (status.status === "FAILED") {
      updated.status = "failed";
      updated.error = status.substatusMessage || "Execution failed";
    }

    // Update amounts
    if (status.receiving?.amount) {
      updated.toAmount = status.receiving.amount;
    }

    // Update gas information
    if (status.gasUsed) {
      updated.gasUsed = status.gasUsed;
    }

    if (status.gasPrice) {
      updated.gasPrice = status.gasPrice;
    }

    return updated;
  }

  /**
   * Convert execution result to status format
   */
  private convertToExecutionStatus(
    executionId: string,
    execution: ExecutionResult,
    lifiStatus?: any
  ): ExecutionStatus {
    return {
      id: executionId,
      status: execution.status,
      substatus: lifiStatus?.substatus,
      substatusMessage: lifiStatus?.substatusMessage,
      fromChain: execution.fromChain,
      toChain: execution.toChain,
      tool: execution.steps[0]?.tool || "unknown",
      steps: execution.steps,
      receiving: lifiStatus?.receiving,
      gasUsed: execution.gasUsed,
      gasPrice: execution.gasPrice,
      timestamp: execution.timestamp,
      error: execution.error,
    };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: string, retryableErrors: string[]): boolean {
    const errorLower = error.toLowerCase();
    return retryableErrors.some((retryableError) =>
      errorLower.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean old execution history
   */
  private cleanExecutionHistory(): void {
    if (this.executionHistory.size <= this.MAX_HISTORY_SIZE) {
      return;
    }

    const executions = Array.from(this.executionHistory.entries()).sort(
      ([, a], [, b]) => b.timestamp - a.timestamp
    );

    // Keep only the most recent executions
    const toKeep = executions.slice(0, this.MAX_HISTORY_SIZE);

    this.executionHistory.clear();
    toKeep.forEach(([id, execution]) => {
      this.executionHistory.set(id, execution);
    });

    logger.debug("Execution history cleaned", {
      kept: toKeep.length,
      removed: executions.length - toKeep.length,
    });
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    total: number;
    pending: number;
    success: number;
    failed: number;
    cancelled: number;
  } {
    const executions = Array.from(this.executionHistory.values());

    return {
      total: executions.length,
      pending: executions.filter((e) => e.status === "pending").length,
      success: executions.filter((e) => e.status === "success").length,
      failed: executions.filter((e) => e.status === "failed").length,
      cancelled: executions.filter((e) => e.status === "cancelled").length,
    };
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.clear();
    this.activeExecutions.clear();
    logger.info("Execution history cleared");
  }
}

export { LiFiRouteExecutorService };
export const lifiRouteExecutor = new LiFiRouteExecutorService();
