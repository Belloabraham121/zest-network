import { Router } from "express";
import { apiController } from "../controllers/api.controller";

const router = Router();

// Health check
router.get("/health", apiController.healthCheck.bind(apiController));

// Wallet endpoints
router.post("/wallet/create", apiController.createWallet.bind(apiController));
router.get("/wallet/balance/:phoneNumber", apiController.getBalance.bind(apiController));

// Transfer endpoints
router.post("/transfer/mnt", apiController.transferMNT.bind(apiController));
router.post("/transfer/mnt/direct", apiController.directMNTTransfer.bind(apiController));
router.post("/transfer/usdc", apiController.transferUSDC.bind(apiController));
router.post("/transfer/phone", apiController.transferToPhone.bind(apiController));

// Relayer endpoints
router.get("/relayer/status", apiController.getRelayerStatus.bind(apiController));

export default router;