import mongoose from "mongoose";
import { env } from "../config/env";
import { Wallet, UserConsent } from "../types";

// Updated Wallet Schema with encrypted private key
const WalletSchema = new mongoose.Schema<Wallet>({
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true }, // AES-256-GCM encrypted
  iv: { type: String, required: true }, // Initialization vector for encryption
  authTag: { type: String, required: true }, // Authentication tag for GCM
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Consent Schema for tracking user agreements
const ConsentSchema = new mongoose.Schema<UserConsent>({
  phone: { type: String, required: true, unique: true },
  hasAgreedToTerms: { type: Boolean, required: true, default: false },
  consentTimestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String }
});

const WalletModel = mongoose.model<Wallet>("Wallet", WalletSchema);
const ConsentModel = mongoose.model<UserConsent>("UserConsent", ConsentSchema);

export class DatabaseService {
  async connect() {
    await mongoose.connect(env.MONGO_URI);
  }

  // Wallet operations
  async getWallet(phone: string): Promise<Wallet | null> {
    return WalletModel.findOne({ phone }).exec();
  }

  async saveWallet(wallet: Wallet): Promise<void> {
    await WalletModel.create(wallet);
  }

  async walletExists(phone: string): Promise<boolean> {
    const wallet = await WalletModel.findOne({ phone }).exec();
    return !!wallet;
  }

  // Consent operations
  async getUserConsent(phone: string): Promise<UserConsent | null> {
    return ConsentModel.findOne({ phone }).exec();
  }

  async saveUserConsent(consent: UserConsent): Promise<void> {
    await ConsentModel.create(consent);
  }

  async updateUserConsent(phone: string, hasAgreed: boolean): Promise<void> {
    await ConsentModel.updateOne(
      { phone },
      { hasAgreedToTerms: hasAgreed, consentTimestamp: new Date() },
      { upsert: true }
    );
  }
}
