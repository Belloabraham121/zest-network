import { Router } from "express";
import { transactionHistoryController } from "../controllers/transaction-history.controller";

const router = Router();

// Get transaction history for a user
router.get(
  "/:phone",
  transactionHistoryController.getUserTransactionHistory.bind(
    transactionHistoryController
  )
);

// Get transaction by ID
router.get(
  "/transaction/:id",
  transactionHistoryController.getTransactionById.bind(
    transactionHistoryController
  )
);

// Get transaction statistics for a user
router.get(
  "/:phone/stats",
  transactionHistoryController.getUserTransactionStats.bind(
    transactionHistoryController
  )
);

// Search transactions for a user
router.get(
  "/:phone/search",
  transactionHistoryController.searchUserTransactions.bind(
    transactionHistoryController
  )
);

// Get transactions by type
router.get(
  "/:phone/type/:type",
  transactionHistoryController.getUserTransactionsByType.bind(
    transactionHistoryController
  )
);

// Get transactions by date range
router.get(
  "/:phone/date-range",
  transactionHistoryController.getUserTransactionsByDateRange.bind(
    transactionHistoryController
  )
);

export default router;
