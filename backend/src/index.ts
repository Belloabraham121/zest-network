import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import whatsappRoutes from "./routes/whatsapp";
import smsRoutes from "./routes/sms";
import ussdRoutes from "./routes/ussd";

// TODO: ✅ Task 13: Setup Express server with webhook routes

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for webhook testing (optional)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ✅ Task 13: Setup webhook routes
app.use("/webhooks/whatsapp", whatsappRoutes);
app.use("/webhooks/sms", smsRoutes);
app.use("/webhooks/ussd", ussdRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "zest-wallet-backend",
    timestamp: new Date().toISOString(),
    endpoints: {
      whatsapp: "/webhooks/whatsapp/webhook",
      sms: "/webhooks/sms/webhook",
      ussd: "/webhooks/ussd/webhook"
    }
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🎉 Zest Wallet Backend API",
    version: "1.0.0",
    description: "Custodial wallet service for Nigeria and Kenya via WhatsApp/SMS",
    nodemon: "✅ Auto-restart enabled with nodemon",
    endpoints: {
      health: "/health",
      whatsapp: "/webhooks/whatsapp/webhook",
      sms: "/webhooks/sms/webhook",
      ussd: "/webhooks/ussd/webhook"
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Zest Wallet Backend running on port ${PORT}`);
  console.log(`📱 WhatsApp webhook: http://localhost:${PORT}/webhooks/whatsapp/webhook`);
  console.log(`📨 SMS webhook: http://localhost:${PORT}/webhooks/sms/webhook`);
  console.log(`📞 USSD webhook: http://localhost:${PORT}/webhooks/ussd/webhook`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection.close().then(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  }).catch((err) => {
    console.error("Error closing MongoDB connection:", err);
    process.exit(1);
  });
});
