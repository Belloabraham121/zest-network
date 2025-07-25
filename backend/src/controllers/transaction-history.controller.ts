import { Request, Response } from "express";
import { TransactionHistoryService } from "../services/transaction-history.service";
import { TransactionHistory } from "../types";

export class TransactionHistoryController {
  private transactionHistoryService: TransactionHistoryService;

  constructor() {
    this.transactionHistoryService = new TransactionHistoryService();
  }

  /**
   * Get transaction history for a user
   * GET /api/transaction-history/:phone
   */
  async getUserTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      const transactions =
        await this.transactionHistoryService.getUserTransactionHistory(
          phone,
          parseInt(limit as string),
          parseInt(offset as string)
        );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error("Error getting transaction history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transaction history",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get transaction by ID
   * GET /api/transaction-history/transaction/:id
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Transaction ID is required",
        });
        return;
      }

      const transaction = await this.transactionHistoryService.getTransaction(
        id
      );

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
        return;
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error("Error getting transaction:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transaction",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get transaction statistics for a user
   * GET /api/transaction-history/:phone/stats
   */
  async getUserTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.params;

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      const stats =
        await this.transactionHistoryService.getUserTransactionStats(phone);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting transaction stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transaction statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Search transactions for a user
   * GET /api/transaction-history/:phone/search?q=searchTerm&limit=20
   */
  async searchUserTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.params;
      const { q: searchTerm, limit = "20" } = req.query;

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          message: "Search term is required",
        });
        return;
      }

      const transactions =
        await this.transactionHistoryService.searchUserTransactions(
          phone,
          searchTerm as string,
          parseInt(limit as string)
        );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          searchTerm,
          limit: parseInt(limit as string),
        },
      });
    } catch (error) {
      console.error("Error searching transactions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search transactions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get transactions by type
   * GET /api/transaction-history/:phone/type/:type
   */
  async getUserTransactionsByType(req: Request, res: Response): Promise<void> {
    try {
      const { phone, type } = req.params;

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      if (!type || !["transfer", "swap", "bridge"].includes(type)) {
        res.status(400).json({
          success: false,
          message:
            "Valid transaction type is required (transfer, swap, bridge)",
        });
        return;
      }

      const transactions =
        await this.transactionHistoryService.getUserTransactionsByType(
          phone,
          type as TransactionHistory["type"]
        );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          type,
        },
      });
    } catch (error) {
      console.error("Error getting transactions by type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transactions by type",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get transactions by date range
   * GET /api/transaction-history/:phone/date-range?startDate=2024-01-01&endDate=2024-01-31
   */
  async getUserTransactionsByDateRange(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { phone } = req.params;
      const { startDate, endDate } = req.query;

      if (!phone) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format",
        });
        return;
      }

      if (start > end) {
        res.status(400).json({
          success: false,
          message: "Start date must be before end date",
        });
        return;
      }

      const transactions =
        await this.transactionHistoryService.getUserTransactionsByDateRange(
          phone,
          start,
          end
        );

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting transactions by date range:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get transactions by date range",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const transactionHistoryController = new TransactionHistoryController();
