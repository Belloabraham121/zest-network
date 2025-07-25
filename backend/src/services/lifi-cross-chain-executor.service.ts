import { lifiService, LiFiService } from './lifi.service';
import { LiFiExecutionEngineService, ExecutionRequest, ExecutionResult, ExecutionStatus } from './lifi-execution-engine.service';
import { LiFiQuoteManagerService, QuoteResponse } from './lifi-quote-manager.service';
import { LiFiChainManager } from './lifi-chain-manager.service';
import { executeWithRateLimit } from './lifi-rate-limiter.service';
import { logger } from '../utils/logger';
import { isChainSupported } from '../config/lifi';

export interface CrossChainExecutionRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippageTolerance?: number;
  gasSettings?: {
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  bridgePreferences?: {
    preferredBridges?: string[];
    excludedBridges?: string[];
    maxBridgeSlippage?: number;
  };
  executionOptions?: {
    autoExecute?: boolean;
    waitForConfirmation?: boolean;
    maxWaitTime?: number;
    enableFallback?: boolean;
  };
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
  };
}

export interface CrossChainExecutionResult {
  success: boolean;
  executionId: string;
  sourceTransaction?: {
    hash: string;
    chainId: number;
    status: ExecutionStatus;
    gasUsed?: string;
    gasPrice?: string;
  };
  bridgeTransaction?: {
    hash: string;
    sourceChainId: number;
    targetChainId: number;
    status: ExecutionStatus;
    bridgeName: string;
    estimatedArrival?: number;
  };
  destinationTransaction?: {
    hash: string;
    chainId: number;
    status: ExecutionStatus;
    gasUsed?: string;
    gasPrice?: string;
  };
  totalExecutionTime: number;
  finalAmount: string;
  fees: {
    gas: string;
    bridge: string;
    protocol: string;
    total: string;
  };
  error?: string;
}

export interface CrossChainMonitor {
  executionId: string;
  status: CrossChainStatus;
  currentPhase: CrossChainPhase;
  progress: number; // 0-100
  sourceChain: {
    chainId: number;
    status: ExecutionStatus;
    transactionHash?: string;
  };
  bridge: {
    name: string;
    status: BridgeStatus;
    estimatedTime?: number;
    actualTime?: number;
  };
  destinationChain: {
    chainId: number;
    status: ExecutionStatus;
    transactionHash?: string;
  };
  lastUpdate: number;
  estimatedCompletion: number;
}

export type CrossChainStatus = 
  | 'INITIALIZING'
  | 'QUOTE_GENERATION'
  | 'SOURCE_EXECUTION'
  | 'BRIDGING'
  | 'DESTINATION_EXECUTION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type CrossChainPhase = 
  | 'PREPARATION'
  | 'SOURCE_CHAIN'
  | 'BRIDGE'
  | 'DESTINATION_CHAIN'
  | 'FINALIZATION';

export type BridgeStatus = 
  | 'PENDING'
  | 'INITIATED'
  | 'IN_PROGRESS'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'FAILED';

class LiFiCrossChainExecutorService {
  private lifiService: LiFiService;
  private executionEngine: LiFiExecutionEngineService;
  private quoteManager: LiFiQuoteManagerService;
  private chainManager: LiFiChainManager;
  private activeExecutions: Map<string, CrossChainMonitor> = new Map();
  private executionHistory: Map<string, CrossChainExecutionResult> = new Map();
  private bridgeStatusCache: Map<string, { status: any; timestamp: number }> = new Map();
  private readonly BRIDGE_STATUS_CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_BRIDGE_WAIT_TIME = 1800000; // 30 minutes

  constructor() {
    this.lifiService = lifiService;
    this.executionEngine = new LiFiExecutionEngineService();
    this.quoteManager = new LiFiQuoteManagerService();
    this.chainManager = new LiFiChainManager();

    // Start bridge monitoring
    this.startBridgeMonitoring();
  }

  /**
   * Execute a cross-chain transaction
   */
  async executeCrossChain(request: CrossChainExecutionRequest): Promise<CrossChainExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      logger.info('Starting cross-chain execution', {
        executionId,
        fromChain: request.fromChain,
        toChain: request.toChain,
        fromToken: request.fromToken,
        toToken: request.toToken,
        fromAmount: request.fromAmount
      });

      // Initialize monitoring
      this.initializeCrossChainMonitor(executionId, request);

      // Phase 1: Generate optimal quote
      const quote = await this.generateOptimalQuote(executionId, request);

      // Phase 2: Execute the cross-chain transaction
      const result = await this.executeWithPhases(executionId, quote, request);

      // Calculate total execution time
      result.totalExecutionTime = Date.now() - startTime;

      // Store in history
      this.executionHistory.set(executionId, result);
      this.activeExecutions.delete(executionId);

      logger.info('Cross-chain execution completed', {
        executionId,
        success: result.success,
        totalTime: result.totalExecutionTime,
        finalAmount: result.finalAmount
      });

      return result;
    } catch (error) {
      const errorResult: CrossChainExecutionResult = {
        success: false,
        executionId,
        totalExecutionTime: Date.now() - startTime,
        finalAmount: '0',
        fees: {
          gas: '0',
          bridge: '0',
          protocol: '0',
          total: '0'
        },
        error: error instanceof Error ? error.message : String(error)
      };

      this.executionHistory.set(executionId, errorResult);
      this.activeExecutions.delete(executionId);

      logger.error('Cross-chain execution failed', {
        executionId,
        error: errorResult.error
      });

      throw error;
    }
  }

  /**
   * Get cross-chain execution status
   */
  async getCrossChainStatus(executionId: string): Promise<CrossChainMonitor | null> {
    const monitor = this.activeExecutions.get(executionId);
    if (!monitor) {
      return null;
    }

    // Update bridge status if in bridging phase
    if (monitor.currentPhase === 'BRIDGE' && monitor.bridge.status === 'IN_PROGRESS') {
      await this.updateBridgeStatus(monitor);
    }

    return monitor;
  }

  /**
   * Cancel cross-chain execution
   */
  async cancelCrossChainExecution(executionId: string): Promise<boolean> {
    const monitor = this.activeExecutions.get(executionId);
    if (!monitor) {
      return false;
    }

    // Can only cancel if not yet bridging
    if (monitor.currentPhase === 'BRIDGE' || monitor.currentPhase === 'DESTINATION_CHAIN') {
      logger.warn('Cannot cancel execution in bridge or destination phase', { executionId });
      return false;
    }

    monitor.status = 'CANCELLED';
    monitor.lastUpdate = Date.now();

    logger.info('Cross-chain execution cancelled', { executionId });
    return true;
  }

  /**
   * Get execution history
   */
  getCrossChainHistory(executionId: string): CrossChainExecutionResult | null {
    return this.executionHistory.get(executionId) || null;
  }

  /**
   * Get all active cross-chain executions
   */
  getActiveCrossChainExecutions(): CrossChainMonitor[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Initialize cross-chain monitor
   */
  private initializeCrossChainMonitor(
    executionId: string,
    request: CrossChainExecutionRequest
  ): void {
    const monitor: CrossChainMonitor = {
      executionId,
      status: 'INITIALIZING',
      currentPhase: 'PREPARATION',
      progress: 0,
      sourceChain: {
        chainId: request.fromChain,
        status: 'PENDING'
      },
      bridge: {
        name: '',
        status: 'PENDING'
      },
      destinationChain: {
        chainId: request.toChain,
        status: 'PENDING'
      },
      lastUpdate: Date.now(),
      estimatedCompletion: Date.now() + this.estimateCrossChainTime(request)
    };

    this.activeExecutions.set(executionId, monitor);
  }

  /**
   * Generate optimal quote for cross-chain execution
   */
  private async generateOptimalQuote(
    executionId: string,
    request: CrossChainExecutionRequest
  ): Promise<QuoteResponse> {
    const monitor = this.activeExecutions.get(executionId)!;
    
    monitor.status = 'QUOTE_GENERATION';
    monitor.progress = 10;
    monitor.lastUpdate = Date.now();

    const quoteRequest = {
      fromChain: request.fromChain,
      toChain: request.toChain,
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress || request.fromAddress,
      slippage: request.slippageTolerance,
      allowBridges: request.bridgePreferences?.preferredBridges,
      denyBridges: request.bridgePreferences?.excludedBridges
    };

    const quote = await this.quoteManager.getQuote(quoteRequest);
    
    // Update monitor with bridge info
    monitor.bridge.name = quote.tool?.name || 'Unknown';
    monitor.progress = 20;
    monitor.lastUpdate = Date.now();

    return quote;
  }

  /**
   * Execute cross-chain transaction with phases
   */
  private async executeWithPhases(
    executionId: string,
    quote: QuoteResponse,
    request: CrossChainExecutionRequest
  ): Promise<CrossChainExecutionResult> {
    const monitor = this.activeExecutions.get(executionId)!;
    const result: CrossChainExecutionResult = {
      success: false,
      executionId,
      totalExecutionTime: 0,
      finalAmount: '0',
      fees: {
        gas: '0',
        bridge: '0',
        protocol: '0',
        total: '0'
      }
    };

    try {
      // Phase 1: Source chain execution
      monitor.status = 'SOURCE_EXECUTION';
      monitor.currentPhase = 'SOURCE_CHAIN';
      monitor.progress = 30;
      monitor.lastUpdate = Date.now();

      const executionRequest: ExecutionRequest = {
        quote,
        fromAddress: request.fromAddress,
        toAddress: request.toAddress,
        gasSettings: request.gasSettings,
        slippageTolerance: request.slippageTolerance,
        metadata: request.metadata
      };

      const executionResult = await this.executionEngine.executeTransaction(executionRequest);
      
      if (!executionResult.success) {
        throw new Error(`Source execution failed: ${executionResult.error}`);
      }

      // Update source transaction info
      result.sourceTransaction = {
        hash: executionResult.transactionHash!,
        chainId: request.fromChain,
        status: 'DONE',
        gasUsed: executionResult.gasUsed,
        gasPrice: executionResult.gasPrice
      };

      monitor.sourceChain.status = 'DONE';
      monitor.sourceChain.transactionHash = executionResult.transactionHash;
      monitor.progress = 50;
      monitor.lastUpdate = Date.now();

      // Phase 2: Bridge monitoring (if cross-chain)
      if (request.fromChain !== request.toChain) {
        await this.monitorBridgeExecution(executionId, result, quote);
      }

      // Phase 3: Destination chain execution (if needed)
      if (quote.includedSteps && quote.includedSteps.length > 1) {
        await this.executeDestinationChain(executionId, result, quote, request);
      }

      // Calculate fees
      result.fees = this.calculateTotalFees(executionResult, quote);
      result.finalAmount = quote.estimate.toAmount;
      result.success = true;

      monitor.status = 'COMPLETED';
      monitor.progress = 100;
      monitor.lastUpdate = Date.now();

      return result;
    } catch (error) {
      monitor.status = 'FAILED';
      monitor.lastUpdate = Date.now();
      
      result.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Monitor bridge execution
   */
  private async monitorBridgeExecution(
    executionId: string,
    result: CrossChainExecutionResult,
    quote: QuoteResponse
  ): Promise<void> {
    const monitor = this.activeExecutions.get(executionId)!;
    
    monitor.status = 'BRIDGING';
    monitor.currentPhase = 'BRIDGE';
    monitor.bridge.status = 'IN_PROGRESS';
    monitor.progress = 60;
    monitor.lastUpdate = Date.now();

    const bridgeStartTime = Date.now();
    const maxWaitTime = this.MAX_BRIDGE_WAIT_TIME;
    
    // Wait for bridge completion
    while (Date.now() - bridgeStartTime < maxWaitTime) {
      await this.updateBridgeStatus(monitor);
      
      if (monitor.bridge.status === 'COMPLETED' as BridgeStatus) {
        result.bridgeTransaction = {
          hash: result.sourceTransaction?.hash || '',
          sourceChainId: quote.action?.fromChainId || 0,
          targetChainId: quote.action?.toChainId || 0,
          status: 'DONE',
          bridgeName: monitor.bridge.name,
          estimatedArrival: monitor.bridge.estimatedTime
        };
        
        monitor.progress = 80;
        monitor.lastUpdate = Date.now();
        return;
      }
      
      if (monitor.bridge.status === 'FAILED' as BridgeStatus) {
        throw new Error('Bridge execution failed');
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    }
    
    throw new Error('Bridge execution timeout');
  }

  /**
   * Execute destination chain transaction
   */
  private async executeDestinationChain(
    executionId: string,
    result: CrossChainExecutionResult,
    quote: QuoteResponse,
    request: CrossChainExecutionRequest
  ): Promise<void> {
    const monitor = this.activeExecutions.get(executionId)!;
    
    monitor.status = 'DESTINATION_EXECUTION';
    monitor.currentPhase = 'DESTINATION_CHAIN';
    monitor.progress = 85;
    monitor.lastUpdate = Date.now();

    // This would handle destination chain execution if needed
    // For now, assume bridge handles the full execution
    
    monitor.destinationChain.status = 'DONE';
    monitor.progress = 95;
    monitor.lastUpdate = Date.now();
  }

  /**
   * Update bridge status
   */
  private async updateBridgeStatus(monitor: CrossChainMonitor): Promise<void> {
    try {
      if (!monitor.sourceChain.transactionHash) {
        return;
      }

      const cacheKey = `bridge_${monitor.sourceChain.transactionHash}`;
      const cached = this.bridgeStatusCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.BRIDGE_STATUS_CACHE_TTL) {
        this.updateMonitorFromBridgeStatus(monitor, cached.status);
        return;
      }

      // Get status from LI.FI
      const status = await executeWithRateLimit(async () => {
        return await this.lifiService.getExecutionStatus(
          monitor.sourceChain.transactionHash!,
          monitor.bridge.name
        );
      });

      // Cache the status
      this.bridgeStatusCache.set(cacheKey, {
        status,
        timestamp: Date.now()
      });

      this.updateMonitorFromBridgeStatus(monitor, status);
    } catch (error) {
      logger.warn('Failed to update bridge status', {
        executionId: monitor.executionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Update monitor from bridge status
   */
  private updateMonitorFromBridgeStatus(monitor: CrossChainMonitor, status: any): void {
    switch (status.status) {
      case 'DONE':
        monitor.bridge.status = 'COMPLETED';
        monitor.bridge.actualTime = Date.now() - monitor.lastUpdate;
        break;
      case 'FAILED':
        monitor.bridge.status = 'FAILED';
        break;
      case 'PENDING':
      case 'NOT_FOUND':
        monitor.bridge.status = 'IN_PROGRESS';
        break;
      default:
        monitor.bridge.status = 'IN_PROGRESS';
    }
    
    monitor.lastUpdate = Date.now();
  }

  /**
   * Calculate total fees
   */
  private calculateTotalFees(executionResult: ExecutionResult, quote: QuoteResponse): {
    gas: string;
    bridge: string;
    protocol: string;
    total: string;
  } {
    const gasFee = executionResult.totalCost || '0';
    
    // Extract bridge and protocol fees from quote
    const bridgeFee = quote.estimate.feeCosts
      .filter(fee => fee.name.toLowerCase().includes('bridge'))
      .reduce((sum, fee) => sum + parseFloat(fee.amount), 0)
      .toString();
    
    const protocolFee = quote.estimate.feeCosts
      .filter(fee => !fee.name.toLowerCase().includes('bridge'))
      .reduce((sum, fee) => sum + parseFloat(fee.amount), 0)
      .toString();
    
    const total = (parseFloat(gasFee) + parseFloat(bridgeFee) + parseFloat(protocolFee)).toString();
    
    return {
      gas: gasFee,
      bridge: bridgeFee,
      protocol: protocolFee,
      total
    };
  }

  /**
   * Estimate cross-chain execution time
   */
  private estimateCrossChainTime(request: CrossChainExecutionRequest): number {
    // Base execution time
    let estimatedTime = 120000; // 2 minutes
    
    // Add bridge time if cross-chain
    if (request.fromChain !== request.toChain) {
      estimatedTime += 600000; // 10 minutes for bridge
    }
    
    // Add extra time for complex routes
    estimatedTime += 60000; // 1 minute buffer
    
    return estimatedTime;
  }

  /**
   * Start bridge monitoring service
   */
  private startBridgeMonitoring(): void {
    setInterval(() => {
      this.monitorActiveBridges();
    }, 30000); // Every 30 seconds
  }

  /**
   * Monitor all active bridges
   */
  private async monitorActiveBridges(): Promise<void> {
    const bridgingExecutions = Array.from(this.activeExecutions.values())
      .filter(monitor => monitor.currentPhase === 'BRIDGE');
    
    for (const monitor of bridgingExecutions) {
      await this.updateBridgeStatus(monitor);
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old execution history
   */
  cleanupHistory(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    
    for (const [id, result] of this.executionHistory.entries()) {
      if (result.totalExecutionTime && result.totalExecutionTime < cutoff) {
        this.executionHistory.delete(id);
      }
    }
    
    // Clean bridge status cache
    for (const [key, cached] of this.bridgeStatusCache.entries()) {
      if (cached.timestamp < cutoff) {
        this.bridgeStatusCache.delete(key);
      }
    }
    
    logger.info('Cross-chain execution history cleaned up', {
      remaining: this.executionHistory.size
    });
  }

  /**
   * Get cross-chain execution statistics
   */
  getCrossChainStats(): {
    active: number;
    total: number;
    successRate: number;
    averageExecutionTime: number;
    bridgeStats: {
      averageBridgeTime: number;
      bridgeSuccessRate: number;
    };
  } {
    const total = this.executionHistory.size;
    const successful = Array.from(this.executionHistory.values())
      .filter(result => result.success).length;
    
    const executionTimes = Array.from(this.executionHistory.values())
      .map(result => result.totalExecutionTime)
      .filter(time => time > 0);
    
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;
    
    const bridgeExecutions = Array.from(this.executionHistory.values())
      .filter(result => result.bridgeTransaction);
    
    const bridgeSuccessful = bridgeExecutions
      .filter(result => result.bridgeTransaction?.status === 'DONE').length;
    
    const bridgeTimes = bridgeExecutions
      .map(result => result.bridgeTransaction?.estimatedArrival || 0)
      .filter(time => time > 0);
    
    const averageBridgeTime = bridgeTimes.length > 0
      ? bridgeTimes.reduce((sum, time) => sum + time, 0) / bridgeTimes.length
      : 0;
    
    return {
      active: this.activeExecutions.size,
      total,
      successRate: total > 0 ? successful / total : 0,
      averageExecutionTime,
      bridgeStats: {
        averageBridgeTime,
        bridgeSuccessRate: bridgeExecutions.length > 0 ? bridgeSuccessful / bridgeExecutions.length : 0
      }
    };
  }
}

export { LiFiCrossChainExecutorService };
export const lifiCrossChainExecutor = new LiFiCrossChainExecutorService();