const mongoose = require("mongoose");
require("dotenv").config();

// Import the rate limiter service
const { rateLimiterService } = require("./dist/services/rate-limiter.service");

async function resetRateLimiter() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");
    console.log("🔄 Resetting SMS/WhatsApp rate limiter...");

    // Reset all rate limits
    const result = await rateLimiterService.resetAllCounters();

    console.log("✅ Rate limiter reset successfully!");
    console.log(`📊 Reset count: ${result.resetCount} users`);
    console.log(
      `📈 New daily limit: ${result.newDailyLimit} messages per user`
    );

    // Get global stats after reset
    const stats = await rateLimiterService.getGlobalStats();
    console.log("\n📊 Current Global Stats:");
    console.log(`- Total messages today: ${stats.totalMessagesToday}`);
    console.log(`- Active users: ${stats.activeUsers}`);
    console.log(`- Users near limit: ${stats.nearLimitUsers}`);
  } catch (error) {
    console.error("❌ Error resetting rate limiter:", error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed");
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
📋 SMS/WhatsApp Rate Limiter Reset Tool
`);
  console.log("Usage:");
  console.log("  node reset-rate-limiter.js           # Reset all users");
  console.log("  node reset-rate-limiter.js --help    # Show this help");
  console.log("");
  console.log("This tool will:");
  console.log("- Reset message counts to 0 for all users");
  console.log("- Set daily limit to 20 messages per user");
  console.log("- Update last reset time to current time");
  console.log("");
  process.exit(0);
}

// Run the reset
resetRateLimiter();
