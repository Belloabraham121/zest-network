import mongoose from "mongoose";
import { env } from "../config/env";
import { Wallet, UserConsent, TransactionHistory } from "../types";

const WalletSchema = new mongoose.Schema<Wallet>({
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  encryptedPrivateKey: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ConsentSchema = new mongoose.Schema<UserConsent>({
  phone: { type: String, required: true, unique: true },
  hasAgreedToTerms: { type: Boolean, required: true, default: false },
  consentTimestamp: { type: Date, default: Date.now },
  ipAddress: { type: String },
  userAgent: { type: String },
});

const TransactionHistorySchema = new mongoose.Schema<TransactionHistory>({
  id: { type: String, required: true, unique: true },
  userPhone: { type: String, required: true, index: true },
  userAddress: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ["transfer", "swap", "bridge"] },
  status: {
    type: String,
    required: true,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
  },

  fromToken: {
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    decimals: { type: Number, required: true },
    chainId: { type: Number, required: true },
    amount: { type: String, required: true },
    amountUSD: { type: String },
  },

  toToken: {
    address: { type: String },
    symbol: { type: String },
    name: { type: String },
    decimals: { type: Number },
    chainId: { type: Number },
    amount: { type: String },
    amountUSD: { type: String },
  },

  fromChain: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
  },

  toChain: {
    id: { type: Number },
    name: { type: String },
    symbol: { type: String },
  },

  recipient: { type: String },
  recipientPhone: { type: String },

  txHash: { type: String, index: true },
  bridgeTxHash: { type: String },
  destinationTxHash: { type: String },

  lifiRouteId: { type: String },
  lifiTool: { type: String },

  fees: {
    gas: {
      amount: { type: String, required: true },
      amountUSD: { type: String },
      token: { type: String, required: true },
    },
    bridge: {
      amount: { type: String },
      amountUSD: { type: String },
      token: { type: String },
      percentage: { type: String },
    },
    protocol: {
      amount: { type: String },
      amountUSD: { type: String },
      token: { type: String },
      percentage: { type: String },
    },
  },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  estimatedDuration: { type: Number },
  actualDuration: { type: Number },

  errorMessage: { type: String },
  errorCode: { type: String },

  initiatedVia: {
    type: String,
    required: true,
    enum: ["whatsapp", "sms", "ussd", "api"],
  },
  slippage: { type: Number },
  priceImpact: { type: String },

  blockNumber: { type: Number },
  blockTimestamp: { type: Number },

  notes: { type: String },
  tags: [{ type: String }],
});

const WalletModel = mongoose.model<Wallet>("Wallet", WalletSchema);
const ConsentModel = mongoose.model<UserConsent>("UserConsent", ConsentSchema);
const TransactionHistoryModel = mongoose.model<TransactionHistory>(
  "TransactionHistory",
  TransactionHistorySchema
);

export class DatabaseService {
  async connect() {
    await mongoose.connect(env.MONGO_URI);
  }

  async getWallet(phone: string): Promise<Wallet | null> {
    return WalletModel.findOne({ phone }).exec();
  }

  async getWalletByAddress(address: string): Promise<Wallet | null> {
    return WalletModel.findOne({ address }).exec();
  }

  async saveWallet(wallet: Wallet): Promise<void> {
    await WalletModel.create(wallet);
  }

  async walletExists(phone: string): Promise<boolean> {
    const wallet = await WalletModel.findOne({ phone }).exec();
    return !!wallet;
  }

  async deleteWallet(phone: string): Promise<boolean> {
    const result = await WalletModel.deleteOne({ phone }).exec();
    return result.deletedCount > 0;
  }

  async getAllWallets(): Promise<
    { phone: string; address: string; createdAt: Date }[]
  > {
    const wallets = await WalletModel.find(
      {},
      { phone: 1, address: 1, createdAt: 1, _id: 0 }
    ).exec();
    return wallets.map((wallet) => ({
      phone: wallet.phone,
      address: wallet.address,
      createdAt: wallet.createdAt || new Date(),
    }));
  }

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

  // Transaction History Methods
  async saveTransactionHistory(transaction: TransactionHistory): Promise<void> {
    await TransactionHistoryModel.create(transaction);
  }

  async getTransactionHistory(
    phone: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionHistory[]> {
    return TransactionHistoryModel.find({ userPhone: phone })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  async getTransactionById(id: string): Promise<TransactionHistory | null> {
    return TransactionHistoryModel.findOne({ id }).exec();
  }

  async getTransactionByTxHash(
    txHash: string
  ): Promise<TransactionHistory | null> {
    return TransactionHistoryModel.findOne({ txHash }).exec();
  }

  async updateTransactionStatus(
    id: string,
    status: TransactionHistory["status"],
    updates: Partial<TransactionHistory> = {}
  ): Promise<void> {
    await TransactionHistoryModel.updateOne(
      { id },
      {
        status,
        updatedAt: new Date(),
        ...(status === "completed" && { completedAt: new Date() }),
        ...updates,
      }
    ).exec();
  }

  async updateTransactionHash(
    id: string,
    txHash: string,
    blockNumber?: number
  ): Promise<void> {
    const updates: Partial<TransactionHistory> = {
      txHash,
      updatedAt: new Date(),
    };
    if (blockNumber) {
      updates.blockNumber = blockNumber;
    }
    await TransactionHistoryModel.updateOne({ id }, updates).exec();
  }

  async getTransactionsByStatus(
    status: TransactionHistory["status"]
  ): Promise<TransactionHistory[]> {
    return TransactionHistoryModel.find({ status }).exec();
  }

  async getTransactionsByType(
    phone: string,
    type: TransactionHistory["type"]
  ): Promise<TransactionHistory[]> {
    return TransactionHistoryModel.find({ userPhone: phone, type })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTransactionsByDateRange(
    phone: string,
    startDate: Date,
    endDate: Date
  ): Promise<TransactionHistory[]> {
    return TransactionHistoryModel.find({
      userPhone: phone,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTransactionStats(phone: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalVolume: { [token: string]: string };
  }> {
    const transactions = await TransactionHistoryModel.find({
      userPhone: phone,
    }).exec();

    const stats = {
      total: transactions.length,
      completed: 0,
      pending: 0,
      failed: 0,
      totalVolume: {} as { [token: string]: string },
    };

    transactions.forEach((tx) => {
      switch (tx.status) {
        case "completed":
          stats.completed++;
          break;
        case "pending":
        case "processing":
          stats.pending++;
          break;
        case "failed":
        case "cancelled":
          stats.failed++;
          break;
      }

      // Track volume by token
      const tokenKey = `${tx.fromToken.symbol}-${tx.fromChain.id}`;
      if (!stats.totalVolume[tokenKey]) {
        stats.totalVolume[tokenKey] = "0";
      }
      // Note: In a real implementation, you'd want to use a proper BigNumber library
      // for accurate decimal arithmetic
    });

    return stats;
  }

  async deleteTransactionHistory(id: string): Promise<boolean> {
    const result = await TransactionHistoryModel.deleteOne({ id }).exec();
    return result.deletedCount > 0;
  }

  async searchTransactions(
    phone: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<TransactionHistory[]> {
    return TransactionHistoryModel.find({
      userPhone: phone,
      $or: [
        { "fromToken.symbol": { $regex: searchTerm, $options: "i" } },
        { "toToken.symbol": { $regex: searchTerm, $options: "i" } },
        { txHash: { $regex: searchTerm, $options: "i" } },
        { recipient: { $regex: searchTerm, $options: "i" } },
        { recipientPhone: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
