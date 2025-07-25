import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "./database.service";
import {
  TransactionHistory,
  LiFiQuoteResponse,
  LiFiExecutionStatus,
} from "../types";
import { LiFiChainManager } from "./lifi-chain-manager.service";
import { LiFiTokenManager } from "./lifi-token-manager.service";

export class TransactionHistoryService {
  private databaseService: DatabaseService;
  private chainManager: LiFiChainManager;
  private tokenManager: LiFiTokenManager;

  constructor() {
    this.databaseService = new DatabaseService();
    this.chainManager = new LiFiChainManager();
    this.tokenManager = new LiFiTokenManager();
  }

  /**
   * Create a new transaction history record from a LI.FI quote
   */
  async createTransactionFromQuote(
    userPhone: string,
    userAddress: string,
    quote: LiFiQuoteResponse,
    initiatedVia: TransactionHistory["initiatedVia"],
    recipient?: string,
    recipientPhone?: string
  ): Promise<string> {
    const transactionId = uuidv4();

    // Determine transaction type
    const isCrossChain = quote.action.fromChainId !== quote.action.toChainId;
    const isSameToken =
      quote.action.fromToken.address.toLowerCase() ===
      quote.action.toToken.address.toLowerCase();

    let type: TransactionHistory["type"];
    if (isCrossChain) {
      type = "bridge";
    } else if (!isSameToken) {
      type = "swap";
    } else {
      type = "transfer";
    }

    // Get chain information
    const fromChainInfo = this.chainManager.getChainMetadata(
      quote.action.fromChainId
    );
    const toChainInfo = isCrossChain
      ? this.chainManager.getChainMetadata(quote.action.toChainId)
      : undefined;

    // Calculate fees
    const gasFees = quote.estimate.gasCosts.reduce(
      (total, gas) => {
        return {
          amount: gas.amount,
          amountUSD: gas.amountUSD,
          token: gas.token.symbol,
        };
      },
      { amount: "0", amountUSD: "0", token: "ETH" }
    );

    const bridgeFees = quote.estimate.feeCosts.find((fee) =>
      fee.name.toLowerCase().includes("bridge")
    );
    const protocolFees = quote.estimate.feeCosts.find(
      (fee) =>
        fee.name.toLowerCase().includes("protocol") ||
        fee.name.toLowerCase().includes("lifi")
    );

    const transaction: TransactionHistory = {
      id: transactionId,
      userPhone,
      userAddress,
      type,
      status: "pending",

      fromToken: {
        address: quote.action.fromToken.address,
        symbol: quote.action.fromToken.symbol,
        name: quote.action.fromToken.name,
        decimals: quote.action.fromToken.decimals,
        chainId: quote.action.fromChainId,
        amount: quote.action.fromAmount,
        amountUSD: this.calculateUSDValue(
          quote.action.fromAmount,
          quote.action.fromToken.decimals
        ),
      },

      toToken: {
        address: quote.action.toToken.address,
        symbol: quote.action.toToken.symbol,
        name: quote.action.toToken.name,
        decimals: quote.action.toToken.decimals,
        chainId: quote.action.toChainId,
        amount: quote.estimate.toAmount,
        amountUSD: this.calculateUSDValue(
          quote.estimate.toAmount,
          quote.action.toToken.decimals
        ),
      },

      fromChain: {
        id: quote.action.fromChainId,
        name: fromChainInfo?.name || "Unknown",
        symbol: fromChainInfo?.symbol || "ETH",
      },

      toChain: toChainInfo
        ? {
            id: quote.action.toChainId,
            name: toChainInfo.name,
            symbol: toChainInfo.symbol,
          }
        : undefined,

      recipient,
      recipientPhone,

      lifiRouteId: quote.id,
      lifiTool: quote.tool,

      fees: {
        gas: gasFees,
        bridge: bridgeFees
          ? {
              amount: bridgeFees.amount,
              amountUSD: bridgeFees.amountUSD,
              token: bridgeFees.token.symbol,
              percentage: bridgeFees.percentage,
            }
          : undefined,
        protocol: protocolFees
          ? {
              amount: protocolFees.amount,
              amountUSD: protocolFees.amountUSD,
              token: protocolFees.token.symbol,
              percentage: protocolFees.percentage,
            }
          : undefined,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedDuration: quote.estimate.executionDuration,

      initiatedVia,
      slippage: quote.action.slippage,
    };

    await this.databaseService.saveTransactionHistory(transaction);
    return transactionId;
  }

  /**
   * Create a simple transfer transaction record
   */
  async createTransferTransaction(
    userPhone: string,
    userAddress: string,
    recipient: string,
    amount: string,
    tokenSymbol: string,
    chainId: number,
    initiatedVia: TransactionHistory["initiatedVia"],
    recipientPhone?: string
  ): Promise<string> {
    const transactionId = uuidv4();
    const chainInfo = this.chainManager.getChainMetadata(chainId);
    const tokenInfo = await this.tokenManager.findTokenBySymbol(
      chainId,
      tokenSymbol
    );

    const transaction: TransactionHistory = {
      id: transactionId,
      userPhone,
      userAddress,
      type: "transfer",
      status: "pending",

      fromToken: {
        address: tokenInfo?.address || "0x0",
        symbol: tokenSymbol,
        name: tokenInfo?.name || tokenSymbol,
        decimals: tokenInfo?.decimals || 18,
        chainId,
        amount,
        amountUSD: this.calculateUSDValue(amount, tokenInfo?.decimals || 18),
      },

      fromChain: {
        id: chainId,
        name: chainInfo?.name || "Unknown",
        symbol: chainInfo?.symbol || "ETH",
      },

      recipient,
      recipientPhone,

      fees: {
        gas: {
          amount: "0",
          token: chainInfo?.symbol || "ETH",
        },
      },

      createdAt: new Date(),
      updatedAt: new Date(),

      initiatedVia,
    };

    await this.databaseService.saveTransactionHistory(transaction);
    return transactionId;
  }

  /**
   * Update transaction with execution status
   */
  async updateTransactionFromExecution(
    transactionId: string,
    executionStatus: LiFiExecutionStatus,
    txHash?: string
  ): Promise<void> {
    const updates: Partial<TransactionHistory> = {
      updatedAt: new Date(),
    };

    // Map LI.FI status to our status
    switch (executionStatus.status) {
      case "PENDING":
        updates.status = "processing";
        break;
      case "DONE":
        updates.status = "completed";
        updates.completedAt = new Date();
        if (executionStatus.timestamp) {
          updates.actualDuration = Math.floor(
            (Date.now() - executionStatus.timestamp) / 1000
          );
        }
        break;
      case "FAILED":
      case "CANCELLED":
        updates.status = "failed";
        updates.errorMessage = executionStatus.substatusMessage;
        break;
      default:
        updates.status = "pending";
    }

    if (txHash) {
      updates.txHash = txHash;
    }

    if (executionStatus.txHash) {
      updates.txHash = executionStatus.txHash;
    }

    if (executionStatus.gasUsed && executionStatus.gasPrice) {
      // Update actual gas fees if available
      const transaction = await this.databaseService.getTransactionById(
        transactionId
      );
      if (transaction) {
        updates.fees = {
          ...transaction.fees,
          gas: {
            ...transaction.fees.gas,
            amount: (
              BigInt(executionStatus.gasUsed) * BigInt(executionStatus.gasPrice)
            ).toString(),
          },
        };
      }
    }

    await this.databaseService.updateTransactionStatus(
      transactionId,
      updates.status!,
      updates
    );
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactionHistory(
    phone: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionHistory[]> {
    return this.databaseService.getTransactionHistory(phone, limit, offset);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<TransactionHistory | null> {
    return this.databaseService.getTransactionById(id);
  }

  /**
   * Get transaction statistics for a user
   */
  async getUserTransactionStats(phone: string) {
    return this.databaseService.getTransactionStats(phone);
  }

  /**
   * Search transactions for a user
   */
  async searchUserTransactions(
    phone: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<TransactionHistory[]> {
    return this.databaseService.searchTransactions(phone, searchTerm, limit);
  }

  /**
   * Get transactions by type
   */
  async getUserTransactionsByType(
    phone: string,
    type: TransactionHistory["type"]
  ): Promise<TransactionHistory[]> {
    return this.databaseService.getTransactionsByType(phone, type);
  }

  /**
   * Get transactions by date range
   */
  async getUserTransactionsByDateRange(
    phone: string,
    startDate: Date,
    endDate: Date
  ): Promise<TransactionHistory[]> {
    return this.databaseService.getTransactionsByDateRange(
      phone,
      startDate,
      endDate
    );
  }

  /**
   * Update transaction with blockchain hash
   */
  async updateTransactionHash(
    transactionId: string,
    txHash: string,
    blockNumber?: number
  ): Promise<void> {
    await this.databaseService.updateTransactionHash(
      transactionId,
      txHash,
      blockNumber
    );
  }

  /**
   * Mark transaction as failed
   */
  async markTransactionFailed(
    transactionId: string,
    errorMessage: string,
    errorCode?: string
  ): Promise<void> {
    await this.databaseService.updateTransactionStatus(
      transactionId,
      "failed",
      {
        errorMessage,
        errorCode,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Mark transaction as completed
   */
  async markTransactionCompleted(transactionId: string): Promise<void> {
    await this.databaseService.updateTransactionStatus(
      transactionId,
      "completed",
      {
        completedAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Calculate USD value (placeholder - in real implementation, use price feeds)
   */
  private calculateUSDValue(amount: string, decimals: number): string {
    // This is a placeholder. In a real implementation, you would:
    // 1. Fetch current token price from a price feed (CoinGecko, CoinMarketCap, etc.)
    // 2. Convert the amount from wei/smallest unit to token units
    // 3. Multiply by current price
    return "0.00";
  }

  /**
   * Get pending transactions that need status updates
   */
  async getPendingTransactions(): Promise<TransactionHistory[]> {
    return this.databaseService.getTransactionsByStatus("pending");
  }

  /**
   * Get processing transactions that need status updates
   */
  async getProcessingTransactions(): Promise<TransactionHistory[]> {
    return this.databaseService.getTransactionsByStatus("processing");
  }
}

export const transactionHistoryService = new TransactionHistoryService();
