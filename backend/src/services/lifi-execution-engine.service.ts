import { lifiService, LiFiService } from "./lifi.service";
import {
  LiFiTransactionBuilderService,
  PreparedTransaction,
  TransactionValidation,
} from "./lifi-transaction-builder.service";
import {
  LiFiQuoteManagerService,
  QuoteResponse,
} from "./lifi-quote-manager.service";
import { LiFiChainManager } from "./lifi-chain-manager.service";
import { executeWithRateLimit } from "./lifi-rate-limiter.service";
import { logger } from "../utils/logger";
import { LiFiExecutionStatus } from "../types";

export interface ExecutionRequest {
  quote: QuoteResponse;
  fromAddress: string;
  toAddress?: string;
  gasSettings?: {
    gasPrice?: string;
    gasLimit?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  slippageTolerance?: number;
  allowInfiniteApproval?: boolean;
  skipValidation?: boolean;
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
  };
}

export interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  status: ExecutionStatus;
  error?: string;
  gasUsed?: string;
  gasPrice?: string;
  totalCost?: string;
  executionTime: number;
  steps: ExecutionStep[];
  metadata?: any;
}

export interface ExecutionStep {
  stepId: string;
  type: "approval" | "swap" | "bridge" | "cross-chain";
  status: ExecutionStatus;
  transactionHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  retryCount: number;
  tool?: {
    name: string;
    logoURI?: string;
  };
}

export type ExecutionStatus =
  | "PENDING"
  | "STARTED"
  | "ACTION_REQUIRED"
  | "CHAIN_SWITCH_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "EXECUTING"
  | "DONE"
  | "FAILED"
  | "CANCELLED";

export interface ExecutionConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  enableFallback: boolean;
  autoApprove: boolean;
  maxSlippageIncrease: number;
}

export interface ExecutionMonitor {
  executionId: string;
  status: ExecutionStatus;
  progress: number; // 0-100
  currentStep: number;
  totalSteps: number;
  estimatedTimeRemaining: number;
  lastUpdate: number;
}

class LiFiExecutionEngineService {
  private lifiService: LiFiService;
  private transactionBuilder: LiFiTransactionBuilderService;
  private quoteManager: LiFiQuoteManagerService;
  private chainManager: LiFiChainManager;
  private activeExecutions: Map<string, ExecutionMonitor> = new Map();
  private executionHistory: Map<string, ExecutionResult> = new Map();
  private readonly defaultConfig: ExecutionConfig = {
    maxRetries: 3,
    retryDelay: 5000,
    timeoutMs: 300000, // 5 minutes
    enableFallback: true,
    autoApprove: false,
    maxSlippageIncrease: 0.02, // 2%
  };

  constructor() {
    this.lifiService = lifiService;
    this.transactionBuilder = new LiFiTransactionBuilderService();
    this.quoteManager = new LiFiQuoteManagerService();
    this.chainManager = new LiFiChainManager();
  }

  /**
   * Execute a cross-chain transaction
   */
  async executeTransaction(
    request: ExecutionRequest,
    config: Partial<ExecutionConfig> = {}
  ): Promise<ExecutionResult> {
    const executionId = this.generateExecutionId();
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    try {
      logger.info("Starting transaction execution", {
        executionId,
        fromChain: request.quote.action?.fromChainId,
        toChain: request.quote.action?.toChainId,
        tool: request.quote.tool?.name,
      });

      // Initialize execution monitor
      this.initializeExecution(executionId, request);

      // Pre-execution validation
      if (!request.skipValidation) {
        await this.validateExecution(request);
      }

      // Build transaction
      const transaction = await this.buildExecutionTransaction(request);

      // Execute with monitoring
      const result = await this.executeWithMonitoring(
        executionId,
        transaction,
        request,
        finalConfig
      );

      // Calculate execution time
      result.executionTime = Date.now() - startTime;

      // Store in history
      this.executionHistory.set(executionId, result);

      // Clean up active execution
      this.activeExecutions.delete(executionId);

      logger.info("Transaction execution completed", {
        executionId,
        success: result.success,
        transactionHash: result.transactionHash,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      const errorResult: ExecutionResult = {
        success: false,
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        steps: [],
      };

      this.executionHistory.set(executionId, errorResult);
      this.activeExecutions.delete(executionId);

      logger.error("Transaction execution failed", {
        executionId,
        error: errorResult.error,
      });

      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(
    executionId: string
  ): Promise<ExecutionMonitor | null> {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(executionId: string): ExecutionResult | null {
    return this.executionHistory.get(executionId) || null;
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = "CANCELLED";
    execution.lastUpdate = Date.now();

    logger.info("Execution cancelled", { executionId });
    return true;
  }

  /**
   * Retry failed execution
   */
  async retryExecution(
    executionId: string,
    config: Partial<ExecutionConfig> = {}
  ): Promise<ExecutionResult> {
    const history = this.executionHistory.get(executionId);
    if (!history || history.success) {
      throw new Error("Cannot retry successful or non-existent execution");
    }

    // Get original request from metadata
    const originalRequest = history.metadata?.originalRequest;
    if (!originalRequest) {
      throw new Error("Original request not found in execution history");
    }

    logger.info("Retrying execution", { executionId });
    return this.executeTransaction(originalRequest, config);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): ExecutionMonitor[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Initialize execution monitoring
   */
  private initializeExecution(
    executionId: string,
    request: ExecutionRequest
  ): void {
    const monitor: ExecutionMonitor = {
      executionId,
      status: "PENDING",
      progress: 0,
      currentStep: 0,
      totalSteps: this.calculateTotalSteps(request.quote),
      estimatedTimeRemaining: this.estimateExecutionTime(request.quote),
      lastUpdate: Date.now(),
    };

    this.activeExecutions.set(executionId, monitor);
  }

  /**
   * Validate execution requirements
   */
  private async validateExecution(request: ExecutionRequest): Promise<void> {
    // Build transaction for validation
    const transaction = await this.transactionBuilder.buildTransaction({
      quote: request.quote,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      gasPrice: request.gasSettings?.gasPrice,
      gasLimit: request.gasSettings?.gasLimit,
      maxFeePerGas: request.gasSettings?.maxFeePerGas,
      maxPriorityFeePerGas: request.gasSettings?.maxPriorityFeePerGas,
      slippageTolerance: request.slippageTolerance,
    });

    // Validate transaction
    const validation = await this.transactionBuilder.validateTransaction(
      transaction,
      request.fromAddress,
      request.quote
    );

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    if (validation.warnings.length > 0) {
      logger.warn("Execution validation warnings", {
        warnings: validation.warnings,
      });
    }
  }

  /**
   * Build transaction for execution
   */
  private async buildExecutionTransaction(
    request: ExecutionRequest
  ): Promise<PreparedTransaction> {
    return this.transactionBuilder.buildTransaction({
      quote: request.quote,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      gasPrice: request.gasSettings?.gasPrice,
      gasLimit: request.gasSettings?.gasLimit,
      maxFeePerGas: request.gasSettings?.maxFeePerGas,
      maxPriorityFeePerGas: request.gasSettings?.maxPriorityFeePerGas,
      slippageTolerance: request.slippageTolerance,
      allowInfiniteApproval: request.allowInfiniteApproval,
    });
  }

  /**
   * Execute transaction with monitoring
   */
  private async executeWithMonitoring(
    executionId: string,
    transaction: PreparedTransaction,
    request: ExecutionRequest,
    config: ExecutionConfig
  ): Promise<ExecutionResult> {
    const monitor = this.activeExecutions.get(executionId)!;
    const steps: ExecutionStep[] = [];
    let retryCount = 0;

    while (retryCount <= config.maxRetries) {
      try {
        // Update monitor
        monitor.status = "EXECUTING";
        monitor.progress = 20;
        monitor.lastUpdate = Date.now();

        // Transform quote to route format for LI.FI execution
        // Use the original fromAddress from the request so the wallet that requested the quote signs the transaction
        const steps = request.quote.includedSteps || [];
        


        // Process steps to handle fee collection correctly
        // Fee collection should NOT be standalone steps, but embedded within real DEX steps
        const feeCollectionSteps = steps.filter(
          (step) => step.tool === "feeCollection"
        );
        const realDexSteps = steps.filter(
          (step) => step.tool !== "feeCollection"
        );

        // Helper function to fix invalid 'protocol' type in includedSteps
        const fixIncludedStepsTypes = (step: any) => {
          // Always return a new object to avoid mutations
          const fixedStep = { ...step };
          
          if (step.includedSteps && Array.isArray(step.includedSteps)) {
            fixedStep.includedSteps = step.includedSteps.map((includedStep: any) => {
              // Fix any step with type 'protocol' to 'swap' (LiFi API only accepts 'swap' type)
              if (includedStep.type === "protocol") {
                return {
                  ...includedStep,
                  type: "swap", // Fix invalid 'protocol' type to valid 'swap' type
                };
              }
              return includedStep;
            });
          }
          
          return fixedStep;
        };

        let processedSteps;
        if (feeCollectionSteps.length > 0 && realDexSteps.length > 0) {
          // Embed fee collection steps within the first real DEX step's includedSteps
          // This is the correct structure according to LiFi API
          processedSteps = realDexSteps.map((step, index) => {
            if (index === 0) {
              // First real DEX step should contain fee collection in includedSteps
              const existingIncludedSteps = step.includedSteps || [];
              const feeStepsForInclusion = feeCollectionSteps.map(
                (feeStep) => ({
                  ...feeStep,
                  type: "swap", // Ensure fee collection has valid type
                })
              );

              return fixIncludedStepsTypes({
                ...step,
                includedSteps: [
                  ...feeStepsForInclusion,
                  ...existingIncludedSteps,
                ],
              });
            }
            return fixIncludedStepsTypes(step);
          });
        } else if (feeCollectionSteps.length > 0) {
          // Only fee collection steps - this shouldn't happen in normal flow
          // But handle gracefully by skipping fee collection (no real DEX to attach to)
          processedSteps = [];
        } else {
          // No fee collection, just process normal steps
          processedSteps = realDexSteps.map((step) =>
            fixIncludedStepsTypes(step)
          );
        }
        


        const route = {
          ...request.quote,
          steps: processedSteps,
          fromAmount: request.quote.estimate?.fromAmount || "0",
          toAmount: request.quote.estimate?.toAmount || "0",
          fromAddress: request.fromAddress, // Use the user's wallet address that requested the quote
        };





        // Execute the route using LI.FI
        const executionResult = await executeWithRateLimit(async () => {
          return await this.lifiService.executeRoute(route, {
            disableMessageSigning: true, // Disable EIP-712 message signing to avoid wallet mismatch
            updateCallback: (updatedRoute: any) => {
              this.handleExecutionUpdate(executionId, updatedRoute, steps);
            },
            switchChainHook: async (chainId: number) => {
              monitor.status = "CHAIN_SWITCH_REQUIRED";
              monitor.lastUpdate = Date.now();
              logger.info("Chain switch required", { executionId, chainId });
              return Promise.resolve();
            },
            acceptSlippageUpdateHook: async (slippageUpdate: any) => {
              const increase =
                slippageUpdate.slippage - (request.slippageTolerance || 0.005);
              if (increase <= config.maxSlippageIncrease) {
                logger.info("Auto-accepting slippage update", {
                  executionId,
                  newSlippage: slippageUpdate.slippage,
                });
                return true;
              }

              monitor.status = "ACTION_REQUIRED";
              monitor.lastUpdate = Date.now();
              logger.warn("Slippage update requires approval", {
                executionId,
                slippageUpdate,
              });
              return false;
            },
          });
        });

        // Update monitor for completion
        monitor.status = "DONE";
        monitor.progress = 100;
        monitor.lastUpdate = Date.now();

        return {
          success: true,
          transactionHash: executionResult.txHash,
          status: "DONE" as ExecutionStatus,
          gasUsed: executionResult.gasUsed,
          executionTime: 0, // Will be set by caller
          steps,
          metadata: {
            originalRequest: request,
            retryCount,
          },
        };
      } catch (error) {
        retryCount++;

        if (retryCount > config.maxRetries) {
          monitor.status = "FAILED";
          monitor.lastUpdate = Date.now();

          throw error;
        }

        logger.warn("Execution attempt failed, retrying", {
          executionId,
          retryCount,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, config.retryDelay));
      }
    }

    throw new Error("Max retries exceeded");
  }

  /**
   * Handle execution updates
   */
  private handleExecutionUpdate(
    executionId: string,
    updatedRoute: any,
    steps: ExecutionStep[]
  ): void {
    const monitor = this.activeExecutions.get(executionId);
    if (!monitor) return;

    // Update progress based on route status
    if (updatedRoute.steps) {
      const completedSteps = updatedRoute.steps.filter(
        (step: any) => step.execution?.status === "DONE"
      ).length;

      monitor.progress = Math.min(
        95,
        (completedSteps / updatedRoute.steps.length) * 100
      );
      monitor.currentStep = completedSteps;
      monitor.lastUpdate = Date.now();

      // Update steps array
      updatedRoute.steps.forEach((step: any, index: number) => {
        if (!steps[index]) {
          steps[index] = {
            stepId: step.id || `step_${index}`,
            type: this.getStepType(step),
            status: this.mapExecutionStatus(step.execution?.status),
            transactionHash: step.execution?.transactionHash,
            gasUsed: step.execution?.gasUsed,
            gasPrice: step.execution?.gasPrice,
            error: step.execution?.error,
            startTime: Date.now(),
            retryCount: 0,
            tool: step.tool,
          };
        } else {
          // Update existing step
          steps[index].status = this.mapExecutionStatus(step.execution?.status);
          steps[index].transactionHash = step.execution?.transactionHash;
          steps[index].gasUsed = step.execution?.gasUsed;
          steps[index].gasPrice = step.execution?.gasPrice;
          steps[index].error = step.execution?.error;
          if (steps[index].status === "DONE" && !steps[index].endTime) {
            steps[index].endTime = Date.now();
          }
        }
      });
    }

    logger.debug("Execution update", {
      executionId,
      progress: monitor.progress,
      currentStep: monitor.currentStep,
      status: monitor.status,
    });
  }

  /**
   * Calculate total steps for execution
   */
  private calculateTotalSteps(quote: QuoteResponse): number {
    return quote.includedSteps?.length || 1;
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(quote: QuoteResponse): number {
    // Base time per step
    const baseTimePerStep = 60000; // 1 minute
    const steps = quote.includedSteps?.length || 1;

    // Add extra time for cross-chain operations
    const isCrossChain = quote.action?.fromChainId !== quote.action?.toChainId;
    const crossChainMultiplier = isCrossChain ? 2 : 1;

    return steps * baseTimePerStep * crossChainMultiplier;
  }

  /**
   * Get step type from step data
   */
  private getStepType(step: any): ExecutionStep["type"] {
    if (step.type === "cross") return "cross-chain";
    if (step.type === "swap") return "swap";
    if (step.type === "bridge") return "bridge";
    return "swap"; // default
  }

  /**
   * Map LI.FI execution status to our status
   */
  private mapExecutionStatus(status: string): ExecutionStatus {
    switch (status) {
      case "NOT_STARTED":
        return "PENDING";
      case "STARTED":
        return "STARTED";
      case "ACTION_REQUIRED":
        return "ACTION_REQUIRED";
      case "CHAIN_SWITCH_REQUIRED":
        return "CHAIN_SWITCH_REQUIRED";
      case "DONE":
        return "DONE";
      case "FAILED":
        return "FAILED";
      case "CANCELLED":
        return "CANCELLED";
      default:
        return "EXECUTING";
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old execution history
   */
  cleanupHistory(maxAge: number = 86400000): void {
    // 24 hours default
    const cutoff = Date.now() - maxAge;

    for (const [id, result] of this.executionHistory.entries()) {
      if (result.executionTime && result.executionTime < cutoff) {
        this.executionHistory.delete(id);
      }
    }

    logger.info("Execution history cleaned up", {
      remaining: this.executionHistory.size,
    });
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    active: number;
    total: number;
    successRate: number;
    averageExecutionTime: number;
  } {
    const total = this.executionHistory.size;
    const successful = Array.from(this.executionHistory.values()).filter(
      (result) => result.success
    ).length;

    const executionTimes = Array.from(this.executionHistory.values())
      .map((result) => result.executionTime)
      .filter((time) => time > 0);

    const averageExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) /
          executionTimes.length
        : 0;

    return {
      active: this.activeExecutions.size,
      total,
      successRate: total > 0 ? successful / total : 0,
      averageExecutionTime,
    };
  }
}

export { LiFiExecutionEngineService };
export const lifiExecutionEngine = new LiFiExecutionEngineService();
