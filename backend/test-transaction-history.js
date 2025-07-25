const mongoose = require("mongoose");
const {
  TransactionHistoryService,
} = require("./src/services/transaction-history.service");

// Simple test script to verify transaction history functionality
async function testTransactionHistory() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://localhost:27017/zest-network", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    const transactionHistoryService = new TransactionHistoryService();

    // Test creating a simple transfer transaction
    const transactionId =
      await transactionHistoryService.createTransferTransaction(
        "+1234567890",
        "0x1234567890123456789012345678901234567890",
        "0x0987654321098765432109876543210987654321",
        "1000000000000000000", // 1 ETH in wei
        "ETH",
        1, // Ethereum mainnet
        "api",
        "+0987654321"
      );

    console.log("✅ Created transaction:", transactionId);

    // Test retrieving the transaction
    const transaction = await transactionHistoryService.getTransaction(
      transactionId
    );
    console.log("✅ Retrieved transaction:", {
      id: transaction?.id,
      type: transaction?.type,
      status: transaction?.status,
      fromToken: transaction?.fromToken?.symbol,
      amount: transaction?.fromToken?.amount,
    });

    // Test getting user transaction history
    const history = await transactionHistoryService.getUserTransactionHistory(
      "+1234567890",
      10,
      0
    );
    console.log("✅ User transaction history count:", history.length);

    // Test transaction stats
    const stats = await transactionHistoryService.getUserTransactionStats(
      "+1234567890"
    );
    console.log("✅ User transaction stats:", stats);

    console.log("\n🎉 All transaction history tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

// Run the test
testTransactionHistory();
