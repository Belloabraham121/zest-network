import { Request, Response } from "express";
import { walletService } from "../services/wallet.service";
import { blockchainService } from "../services/blockchain.service";

export class ApiController {
  async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      const result = await walletService.createWallet(phoneNumber, "sms");

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error creating wallet:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get wallet balances
   * GET /api/wallet/balance/:phoneNumber
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.params;

      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          message: "Phone number is required",
        });
        return;
      }

      const result = await walletService.getWalletBalances(phoneNumber);

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error getting balance:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Transfer MNT tokens (phone-based)
   * POST /api/transfer/mnt
   */
  async transferMNT(req: Request, res: Response): Promise<void> {
    try {
      const { senderPhone, recipientAddress, amount, recipientPhone } =
        req.body;

      if (!senderPhone || !recipientAddress || !amount) {
        res.status(400).json({
          success: false,
          message: "senderPhone, recipientAddress, and amount are required",
        });
        return;
      }

      const result = await walletService.transferMNT(
        senderPhone,
        recipientAddress,
        amount.toString(),
        recipientPhone
      );

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error transferring MNT:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Direct MNT transfer to address
   * POST /api/transfer/mnt/direct
   */
  async directMNTTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { fromPrivateKey, toAddress, amount } = req.body;

      if (!fromPrivateKey || !toAddress || !amount) {
        res.status(400).json({
          success: false,
          message: "fromPrivateKey, toAddress, and amount are required",
        });
        return;
      }

      // Validate address format
      if (!blockchainService.isValidAddress(toAddress)) {
        res.status(400).json({
          success: false,
          message: "Invalid recipient address format",
        });
        return;
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        res.status(400).json({
          success: false,
          message: "Invalid amount. Must be a positive number",
        });
        return;
      }

      const result = await blockchainService.transferMNT(
        fromPrivateKey,
        toAddress,
        amount.toString(),
        "direct_transfer", // sender identifier
        toAddress // recipient identifier
      );

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error in direct MNT transfer:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Transfer USDC tokens
   * POST /api/transfer/usdc
   */
  async transferUSDC(req: Request, res: Response): Promise<void> {
    try {
      const { senderPhone, recipientAddress, amount, recipientPhone } =
        req.body;

      if (!senderPhone || !recipientAddress || !amount) {
        res.status(400).json({
          success: false,
          message: "senderPhone, recipientAddress, and amount are required",
        });
        return;
      }

      const result = await walletService.transferUSDC(
        senderPhone,
        recipientAddress,
        amount.toString(),
        recipientPhone
      );

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error transferring USDC:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Transfer tokens to phone number
   * POST /api/transfer/phone
   */
  async transferToPhone(req: Request, res: Response): Promise<void> {
    try {
      const { senderPhone, recipientPhone, amount, token } = req.body;

      if (!senderPhone || !recipientPhone || !amount || !token) {
        res.status(400).json({
          success: false,
          message:
            "senderPhone, recipientPhone, amount, and token are required",
        });
        return;
      }

      if (token !== "MNT" && token !== "USDC") {
        res.status(400).json({
          success: false,
          message: "Invalid token. Supported tokens: MNT, USDC",
        });
        return;
      }

      const result = await walletService.transferToPhone(
        senderPhone,
        recipientPhone,
        amount.toString(),
        token as "MNT" | "USDC"
      );

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error("Error transferring to phone:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get relayer status
   * GET /api/relayer/status
   */
  async getRelayerStatus(req: Request, res: Response): Promise<void> {
    try {
      const balance = await blockchainService.getRelayerBalance();
      const gasPrice = await blockchainService.getGasPrice();

      res.status(200).json({
        success: true,
        relayer: {
          balance: `${parseFloat(balance).toFixed(4)} MNT`,
          gasPrice: `${gasPrice} gwei`,
          status: parseFloat(balance) > 0.1 ? "healthy" : "low_balance",
        },
      });
    } catch (error) {
      console.error("Error getting relayer status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Health check
   * GET /api/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const relayerBalance = await blockchainService.getRelayerBalance();

      res.status(200).json({
        status: "healthy",
        service: "zest-wallet-api",
        timestamp: new Date().toISOString(),
        relayer: {
          balance: `${parseFloat(relayerBalance).toFixed(4)} MNT`,
          status: parseFloat(relayerBalance) > 0.1 ? "healthy" : "low_balance",
        },
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({
        status: "unhealthy",
        service: "zest-wallet-api",
        timestamp: new Date().toISOString(),
        error: "Service unavailable",
      });
    }
  }
}

export const apiController = new ApiController();
