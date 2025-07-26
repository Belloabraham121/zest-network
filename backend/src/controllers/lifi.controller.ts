import { Request, Response } from "express";
import { lifiQuoteManager } from "../services/lifi-quote-manager.service";
import { lifiExecutionEngine } from "../services/lifi-execution-engine.service";
import { lifiCrossChainExecutor } from "../services/lifi-cross-chain-executor.service";
import { lifiService } from "../services/lifi.service";
import { lifiChainManager } from "../services/lifi-chain-manager.service";
import { lifiTokenManager } from "../services/lifi-token-manager.service";
import { lifiToolsProvider } from "../services/lifi-tools-provider.service";
import { TransactionHistoryService } from "../services/transaction-history.service";
import { logger } from "../utils/logger";
import { LiFiQuoteRequest } from "../types";
import { QuoteRequest } from "../services/lifi-quote-manager.service";

export class LiFiController {
  /**
   * Get a quote for a token swap/bridge
   * POST /api/lifi/quote
   */
  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const quoteRequest: QuoteRequest = req.body;

      // Validate required fields
      if (
        !quoteRequest.fromChain ||
        !quoteRequest.toChain ||
        !quoteRequest.fromToken ||
        !quoteRequest.toToken ||
        !quoteRequest.fromAmount
      ) {
        res.status(400).json({
          success: false,
          message:
            "Missing required fields: fromChain, toChain, fromToken, toToken, fromAmount",
        });
        return;
      }

      const quote = await lifiQuoteManager.getQuote(quoteRequest);

      // Record quote request in transaction history
      try {
        const transactionHistoryService = new TransactionHistoryService();
        await transactionHistoryService.createTransactionFromQuote(
          quoteRequest.fromAddress || "unknown",
          quoteRequest.fromAddress || "unknown",
          quote as any, // Type conversion needed due to interface differences
          "api"
        );
      } catch (historyError) {
        logger.warn("Failed to record transaction history for quote", {
          error:
            historyError instanceof Error
              ? historyError.message
              : String(historyError),
        });
      }

      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (error) {
      logger.error("Error getting quote", {
        error: error instanceof Error ? error.message : String(error),
        request: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get quote",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get a cross-chain quote
   * POST /api/lifi/cross-chain-quote
   */
  async getCrossChainQuote(req: Request, res: Response): Promise<void> {
    try {
      const quoteRequest: QuoteRequest = req.body;

      // Validate required fields
      if (
        !quoteRequest.fromChain ||
        !quoteRequest.toChain ||
        !quoteRequest.fromToken ||
        !quoteRequest.toToken ||
        !quoteRequest.fromAmount ||
        !quoteRequest.fromAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "Missing required fields: fromChain, toChain, fromToken, toToken, fromAmount, fromAddress",
        });
        return;
      }

      const quote = await lifiQuoteManager.getQuote(quoteRequest);

      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (error) {
      logger.error("Error getting cross-chain quote", {
        error: error instanceof Error ? error.message : String(error),
        request: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get cross-chain quote",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Compare multiple quotes
   * POST /api/lifi/quote/compare
   */
  async compareQuotes(req: Request, res: Response): Promise<void> {
    try {
      const quoteRequest: QuoteRequest = req.body;
      const options = req.query;

      const comparison = await lifiQuoteManager.getQuoteComparison(
        quoteRequest,
        options
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error("Error comparing quotes", {
        error: error instanceof Error ? error.message : String(error),
        request: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Failed to compare quotes",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get quote history
   * GET /api/lifi/quote/history/:userId
   */
  async getQuoteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "userId is required",
        });
        return;
      }

      // For now, return cache stats as a placeholder for quote history
      const cacheStats = lifiQuoteManager.getCacheStats();

      res.status(200).json({
        success: true,
        data: {
          userId,
          cacheStats,
          message:
            "Quote history feature will be implemented with database integration",
        },
      });
    } catch (error) {
      logger.error("Error getting quote history", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get quote history",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute a transaction
   * POST /api/lifi/execute
   */
  async executeTransaction(req: Request, res: Response): Promise<void> {
    try {
      const executionRequest = req.body;

      // Validate required fields
      if (!executionRequest.quote || !executionRequest.signer) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: quote, signer",
        });
        return;
      }

      const result = await lifiExecutionEngine.executeTransaction(
        executionRequest
      );

      // Record transaction execution in history
      try {
        const transactionHistoryService = new TransactionHistoryService();
        await transactionHistoryService.createTransactionFromQuote(
          "unknown", // phone number not available in this context
          executionRequest.signer,
          executionRequest.quote,
          "api"
        );

        // Update with transaction hash if available
        if (result.transactionHash) {
          // Generate a unique transaction ID since ExecutionResult doesn't have executionId
          const transactionId = `exec_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
          await transactionHistoryService.updateTransactionHash(
            transactionId,
            result.transactionHash
          );
        }
      } catch (historyError) {
        logger.warn("Failed to record transaction history for execution", {
          error:
            historyError instanceof Error
              ? historyError.message
              : String(historyError),
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error executing transaction", {
        error: error instanceof Error ? error.message : String(error),
        request: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Failed to execute transaction",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute a cross-chain transaction
   * POST /api/lifi/cross-chain-execute
   */
  async executeCrossChainTransaction(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const executionRequest = req.body;

      // Validate required fields
      if (
        !executionRequest.fromChain ||
        !executionRequest.toChain ||
        !executionRequest.fromToken ||
        !executionRequest.toToken ||
        !executionRequest.fromAmount ||
        !executionRequest.fromAddress
      ) {
        res.status(400).json({
          success: false,
          message:
            "Missing required fields: fromChain, toChain, fromToken, toToken, fromAmount, fromAddress",
        });
        return;
      }

      const result = await lifiCrossChainExecutor.executeCrossChain(
        executionRequest
      );

      // Record cross-chain transaction in history
      try {
        const transactionHistoryService = new TransactionHistoryService();
        // Create a mock quote from the execution request for history recording
        const mockQuote = {
          id: result.executionId,
          action: {
            fromChainId: executionRequest.fromChain,
            toChainId: executionRequest.toChain,
            fromToken: {
              address: executionRequest.fromToken,
              symbol: "UNKNOWN",
              name: "Unknown Token",
              decimals: 18,
            },
            toToken: {
              address: executionRequest.toToken,
              symbol: "UNKNOWN",
              name: "Unknown Token",
              decimals: 18,
            },
            fromAmount: executionRequest.fromAmount,
          },
          estimate: {
            toAmount: result.finalAmount,
            gasCosts: [],
            feeCosts: [],
            executionDuration: 0,
          },
          tool: "lifi",
        };

        await transactionHistoryService.createTransactionFromQuote(
          "unknown", // phone number not available in this context
          executionRequest.fromAddress,
          mockQuote as any,
          "api"
        );

        // Update with transaction hash if available
        if (result.sourceTransaction?.hash) {
          await transactionHistoryService.updateTransactionHash(
            result.executionId,
            result.sourceTransaction.hash
          );
        }
      } catch (historyError) {
        logger.warn(
          "Failed to record transaction history for cross-chain execution",
          {
            error:
              historyError instanceof Error
                ? historyError.message
                : String(historyError),
          }
        );
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error executing cross-chain transaction", {
        error: error instanceof Error ? error.message : String(error),
        request: req.body,
      });

      res.status(500).json({
        success: false,
        message: "Failed to execute cross-chain transaction",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get transaction status
   * GET /api/lifi/status/:executionId
   */
  async getTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;

      if (!executionId) {
        res.status(400).json({
          success: false,
          message: "executionId is required",
        });
        return;
      }

      // Try to get status from execution engine first
      let status: any = await lifiExecutionEngine.getExecutionStatus(
        executionId
      );

      // If not found, try cross-chain executor
      if (!status) {
        status = await lifiCrossChainExecutor.getCrossChainStatus(executionId);
      }

      if (!status) {
        res.status(404).json({
          success: false,
          message: "Execution not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error("Error getting transaction status", {
        error: error instanceof Error ? error.message : String(error),
        executionId: req.params.executionId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get transaction status",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get execution history
   * GET /api/lifi/execution/history/:userId
   */
  async getExecutionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "userId is required",
        });
        return;
      }

      const history = await lifiExecutionEngine.getExecutionHistory(userId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Error getting execution history", {
        error: error instanceof Error ? error.message : String(error),
        userId: req.params.userId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get execution history",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get supported chains
   * GET /api/lifi/chains
   */
  async getChains(req: Request, res: Response): Promise<void> {
    try {
      const chains = await lifiChainManager.getSupportedChains();

      res.status(200).json({
        success: true,
        data: chains,
      });
    } catch (error) {
      logger.error("Error getting chains", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Failed to get chains",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get supported tokens for a chain
   * GET /api/lifi/tokens/:chainId
   */
  async getTokens(req: Request, res: Response): Promise<void> {
    try {
      const { chainId } = req.params;

      if (!chainId) {
        res.status(400).json({
          success: false,
          message: "chainId is required",
        });
        return;
      }

      const tokens = await lifiService.getTokens(parseInt(chainId));

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      logger.error("Error getting tokens", {
        error: error instanceof Error ? error.message : String(error),
        chainId: req.params.chainId,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get tokens",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get available tools (bridges and exchanges)
   * GET /api/lifi/tools
   */
  async getTools(req: Request, res: Response): Promise<void> {
    try {
      const { chains } = req.query;
      const chainIds = chains
        ? (chains as string).split(",").map(Number)
        : undefined;

      const tools = await lifiToolsProvider.getTools();

      res.status(200).json({
        success: true,
        data: tools,
      });
    } catch (error) {
      logger.error("Error getting tools", {
        error: error instanceof Error ? error.message : String(error),
        chains: req.query.chains,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get tools",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get supported token pairs
   * GET /api/lifi/pairs
   */
  async getSupportedPairs(req: Request, res: Response): Promise<void> {
    try {
      const { fromChain, toChain } = req.query;

      if (!fromChain || !toChain) {
        res.status(400).json({
          success: false,
          message: "fromChain and toChain are required",
        });
        return;
      }

      const fromChainId = parseInt(fromChain as string);
      const toChainId = parseInt(toChain as string);

      // Get tokens for both chains
      const [fromTokens, toTokens] = await Promise.all([
        lifiService.getTokens(fromChainId),
        lifiService.getTokens(toChainId),
      ]);

      // Create supported pairs
      const pairs = {
        fromChain: fromChainId,
        toChain: toChainId,
        fromTokens,
        toTokens,
        supportedPairs: fromTokens.length * toTokens.length,
      };

      res.status(200).json({
        success: true,
        data: pairs,
      });
    } catch (error) {
      logger.error("Error getting supported pairs", {
        error: error instanceof Error ? error.message : String(error),
        fromChain: req.query.fromChain,
        toChain: req.query.toChain,
      });

      res.status(500).json({
        success: false,
        message: "Failed to get supported pairs",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear all caches
   * POST /api/lifi/cache/clear
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      // Clear quote manager cache
      lifiQuoteManager.clearCache();

      // Clear other service caches
      lifiChainManager.clearCache();
      lifiTokenManager.clearCache();
      lifiToolsProvider.clearCache();

      logger.info("All LiFi caches cleared successfully");

      res.status(200).json({
        success: true,
        message: "All caches cleared successfully",
        data: {
          clearedCaches: ["quotes", "routes", "chains", "tokens", "tools"],
        },
      });
    } catch (error) {
      logger.error("Error clearing caches", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: "Failed to clear caches",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Health check for LI.FI service
   * GET /api/lifi/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await lifiService.getHealthStatus();

      const isHealthy =
        health.initialized && health.chainsLoaded && health.toolsLoaded;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: health,
      });
    } catch (error) {
      logger.error("Error checking LI.FI health", {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(503).json({
        success: false,
        message: "LI.FI service health check failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const lifiController = new LiFiController();
