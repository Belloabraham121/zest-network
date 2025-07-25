const mongoose = require("mongoose");
require("dotenv").config();

// Import the rate limiter service
const { rateLimiterService } = require("./dist/services/rate-limiter.service");

async function checkRateLimiter() {
  try {
    console.log("🔄 Connecting to MongoDB...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");
    console.log("📊 Checking SMS/WhatsApp rate limiter status...\n");

    // Get global stats
    const stats = await rateLimiterService.getGlobalStats();
    console.log("📈 Global Rate Limiter Stats:");
    console.log(`- Total messages today: ${stats.totalMessagesToday}`);
    console.log(`- Active users: ${stats.activeUsers}`);
    console.log(`- Users near limit: ${stats.nearLimitUsers}`);

    // Get all rate limit records from database
    const collection = mongoose.connection.db?.collection("rate_limits");
    if (collection) {
      const allRecords = await collection.find({}).toArray();

      if (allRecords.length > 0) {
        console.log("\n👥 Individual User Status:");
        console.log("─".repeat(80));
        console.log("Phone Number\t\tMessages\tLimit\tRemaining\tLast Reset");
        console.log("─".repeat(80));

        for (const record of allRecords) {
          const status = await rateLimiterService.getRateLimitStatus(
            record.phoneNumber
          );
          const lastReset = new Date(record.lastReset).toLocaleString();
          console.log(
            `${record.phoneNumber}\t${status.messageCount}\t\t${status.dailyLimit}\t${status.remaining}\t\t${lastReset}`
          );
        }
        console.log("─".repeat(80));
      } else {
        console.log("\n📝 No rate limit records found in database.");
      }
    }
  } catch (error) {
    console.error("❌ Error checking rate limiter:", error);
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
  console.log(`\n📋 SMS/WhatsApp Rate Limiter Status Checker\n`);
  console.log("Usage:");
  console.log("  node check-rate-limiter.js           # Check current status");
  console.log("  node check-rate-limiter.js --help    # Show this help");
  console.log("");
  console.log("This tool will show:");
  console.log("- Global rate limiter statistics");
  console.log("- Individual user message counts and limits");
  console.log("- Remaining messages for each user");
  console.log("");
  process.exit(0);
}

// Run the check
checkRateLimiter();
