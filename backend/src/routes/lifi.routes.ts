import { Router } from "express";
import { lifiController } from "../controllers/lifi.controller";

const router = Router();

// Health check
router.get("/health", lifiController.healthCheck.bind(lifiController));

// Quote endpoints
router.post("/quote", lifiController.getQuote.bind(lifiController));
router.post(
  "/cross-chain-quote",
  lifiController.getCrossChainQuote.bind(lifiController)
);
router.post(
  "/quote/compare",
  lifiController.compareQuotes.bind(lifiController)
);
router.get(
  "/quote/history/:userId",
  lifiController.getQuoteHistory.bind(lifiController)
);

// Execution endpoints
router.post("/execute", lifiController.executeTransaction.bind(lifiController));
router.post(
  "/cross-chain-execute",
  lifiController.executeCrossChainTransaction.bind(lifiController)
);
router.get(
  "/status/:executionId",
  lifiController.getTransactionStatus.bind(lifiController)
);
router.get(
  "/execution/history/:userId",
  lifiController.getExecutionHistory.bind(lifiController)
);

// Information endpoints
router.get("/chains", lifiController.getChains.bind(lifiController));
router.get("/tokens/:chainId", lifiController.getTokens.bind(lifiController));
router.get("/tools", lifiController.getTools.bind(lifiController));
router.get("/pairs", lifiController.getSupportedPairs.bind(lifiController));

// Cache management
router.post("/cache/clear", lifiController.clearCache.bind(lifiController));

export default router;
