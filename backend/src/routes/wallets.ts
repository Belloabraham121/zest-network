import express from "express";
import { walletsController } from "../controllers/wallets.controller";

const router = express.Router();

router.get("/", async (req, res) => {
  await walletsController.getAllWallets(req, res);
});

export default router;
