import express from "express";
import { walletsController } from "../controllers/wallets.controller";

const router = express.Router();

// GET /api/wallets - Get all registered wallets
router.get("/", async (req, res) => {
  await walletsController.getAllWallets(req, res);
});

export default router;