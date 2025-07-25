import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import whatsappRoutes from "./routes/whatsapp";
import smsRoutes from "./routes/sms";
import ussdRoutes from "./routes/ussd";
import walletsRoutes from "./routes/wallets";
import apiRoutes from "./routes/api.routes";
import tokensRoutes from "./routes/tokens.routes";
import rateLimiterRoutes from "./routes/rate-limiter.routes";
import lifiRoutes from "./routes/lifi.routes";
import transactionHistoryRoutes from "./routes/transaction-history.routes";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for webhook testing (optional)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/webhooks/whatsapp", whatsappRoutes);
app.use("/webhooks/sms", smsRoutes);
app.use("/webhooks/ussd", ussdRoutes);

app.use("/api/wallets", walletsRoutes);
app.use("/api/tokens", tokensRoutes);
app.use("/api/rate-limiter", rateLimiterRoutes);
app.use("/api/lifi", lifiRoutes);
app.use("/api/transaction-history", transactionHistoryRoutes);
app.use("/api", apiRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "zest-wallet-backend",
    timestamp: new Date().toISOString(),
    endpoints: {
      whatsapp: "/webhooks/whatsapp/webhook",
      sms: "/webhooks/sms/webhook",
      ussd: "/webhooks/ussd/webhook",
      wallets: "/api/wallets",
      tokens: "/api/tokens",
      transfers: "/api/transfer",
      directMNT: "/api/transfer/mnt/direct",
      balance: "/api/wallet/balance",
      relayer: "/api/relayer/status",
      lifi: "/api/lifi",
      transactionHistory: "/api/transaction-history",
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🎉 Zest Wallet Backend API",
    version: "1.0.0",
    description:
      "Custodial wallet service with MNT token transfers via WhatsApp/SMS",
    features: [
      "🔐 Secure custodial wallets",
      "💎 MNT & USDC token transfers",
      "⛽ Gasless transactions (relayer pays fees)",
      "📱 WhatsApp & SMS integration",
      "🔗 Mantle blockchain support",
    ],
    nodemon: "✅ Auto-restart enabled with nodemon",
    endpoints: {
      health: "/health",
      whatsapp: "/webhooks/whatsapp/webhook",
      sms: "/webhooks/sms/webhook",
      ussd: "/webhooks/ussd/webhook",
      wallets: "/api/wallets",
      tokens: "/api/tokens",
      transfers: "/api/transfer",
      directMNT: "/api/transfer/mnt/direct",
      balance: "/api/wallet/balance",
      relayer: "/api/relayer/status",
      lifi: "/api/lifi",
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Zest Wallet Backend running on port ${PORT}`);
  console.log(
    `📱 WhatsApp webhook: http://localhost:${PORT}/webhooks/whatsapp/webhook`
  );
  console.log(`📨 SMS webhook: http://localhost:${PORT}/webhooks/sms/webhook`);
  console.log(
    `📞 USSD webhook: http://localhost:${PORT}/webhooks/ussd/webhook`
  );
  console.log(`💼 Wallets API: http://localhost:${PORT}/api/wallets`);
  console.log(`🪙 Tokens API: http://localhost:${PORT}/api/tokens`);
  console.log(`💎 Transfer API: http://localhost:${PORT}/api/transfer`);
  console.log(
    `🚀 Direct MNT Transfer: http://localhost:${PORT}/api/transfer/mnt/direct`
  );
  console.log(`💰 Balance API: http://localhost:${PORT}/api/wallet/balance`);
  console.log(`⛽ Relayer Status: http://localhost:${PORT}/api/relayer/status`);
  console.log(`📊 Rate Limiter API: http://localhost:${PORT}/api/rate-limiter`);
  console.log(`🌉 LI.FI API: http://localhost:${PORT}/api/lifi`);
  console.log(
    `📜 Transaction History API: http://localhost:${PORT}/api/transaction-history`
  );
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection
    .close()
    .then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error closing MongoDB connection:", err);
      process.exit(1);
    });
});
