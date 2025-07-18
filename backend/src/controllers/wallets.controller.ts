import { Request, Response } from "express";
import { DatabaseService } from "../services/database.service";

const dbService = new DatabaseService();

dbService.connect().catch(console.error);

export class WalletsController {
  async getAllWallets(req: Request, res: Response): Promise<void> {
    try {
      const wallets = await dbService.getAllWallets();

      const response = {
        success: true,
        count: wallets.length,
        data: wallets.map((wallet) => ({
          phoneNumber: wallet.phone,
          walletAddress: wallet.address,
          createdAt: wallet.createdAt,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching wallets:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch wallets",
        error: process.env.NODE_ENV === "development" ? error : undefined,
      });
    }
  }
}

export const walletsController = new WalletsController();
