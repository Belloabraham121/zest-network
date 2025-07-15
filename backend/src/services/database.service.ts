import mongoose from "mongoose";
import { env } from "../config/env";
import { Wallet } from "../types";

const WalletSchema = new mongoose.Schema<Wallet>({
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  privateKey: { type: String, required: true },
});

const WalletModel = mongoose.model<Wallet>("Wallet", WalletSchema);

export class DatabaseService {
  async connect() {
    await mongoose.connect(env.MONGO_URI);
  }

  async getWallet(phone: string): Promise<Wallet | null> {
    return WalletModel.findOne({ phone }).exec();
  }

  async saveWallet(wallet: Wallet): Promise<void> {
    await WalletModel.create(wallet);
  }
}
