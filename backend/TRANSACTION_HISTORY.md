# Transaction History Feature

This document describes the comprehensive transaction history feature implemented in the Zest Network backend.

## Overview

The transaction history feature automatically tracks and stores all transfer, swap, and bridge operations in the database. It provides detailed information about each transaction including:

- User information (phone, address)
- Token details (from/to tokens with amounts and USD values)
- Chain information (source and destination chains)
- Transaction hashes and status
- Fees breakdown (gas, bridge, protocol fees)
- LI.FI specific data (route ID, tool used)
- Timing information (created, updated, completed)
- Error handling and retry information

## Database Schema

The `TransactionHistory` interface defines the structure:

```typescript
interface TransactionHistory {
  id: string;
  userPhone: string;
  userAddress: string;
  type: "transfer" | "swap" | "bridge";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";

  fromToken: TokenInfo;
  toToken?: TokenInfo;
  fromChain: ChainInfo;
  toChain?: ChainInfo;

  recipient?: string;
  recipientPhone?: string;

  txHash?: string;
  blockNumber?: number;

  lifiRouteId?: string;
  lifiTool?: string;

  fees: {
    gas: FeeInfo;
    bridge?: FeeInfo;
    protocol?: FeeInfo;
  };

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  estimatedDuration?: number;
  actualDuration?: number;

  initiatedVia: "whatsapp" | "sms" | "ussd" | "api";

  errorMessage?: string;
  errorCode?: string;
  retryCount?: number;

  slippage?: number;
  metadata?: Record<string, any>;
}
```

## API Endpoints

### Get User Transaction History

```
GET /api/transaction-history/:phone
Query Parameters:
- limit (optional): Number of transactions to return (default: 50)
- offset (optional): Number of transactions to skip (default: 0)
```

### Get Transaction by ID

```
GET /api/transaction-history/transaction/:id
```

### Get Transaction Statistics

```
GET /api/transaction-history/stats/:phone
```

### Search Transactions

```
GET /api/transaction-history/search/:phone
Query Parameters:
- q: Search term (searches in token symbols, transaction hashes, etc.)
- limit (optional): Number of results (default: 20)
```

### Filter by Transaction Type

```
GET /api/transaction-history/type/:phone/:type
Path Parameters:
- type: 'transfer' | 'swap' | 'bridge'
```

### Filter by Date Range

```
GET /api/transaction-history/date-range/:phone
Query Parameters:
- startDate: ISO date string
- endDate: ISO date string
```

## Service Integration

### Automatic Recording

Transactions are automatically recorded when:

1. **LI.FI Quotes**: When a quote is generated via `/api/lifi/quote`
2. **Transaction Execution**: When transactions are executed via `/api/lifi/execute`
3. **Cross-Chain Execution**: When cross-chain transactions are executed via `/api/lifi/cross-chain-execute`

### Manual Recording

You can also manually record transactions using the `TransactionHistoryService`:

```typescript
import { TransactionHistoryService } from "./services/transaction-history.service";

const transactionHistoryService = new TransactionHistoryService();

// Record a LI.FI quote-based transaction
const transactionId =
  await transactionHistoryService.createTransactionFromQuote(
    userPhone,
    userAddress,
    lifiQuote,
    "api",
    recipient,
    recipientPhone
  );

// Record a simple transfer
const transferId = await transactionHistoryService.createTransferTransaction(
  userPhone,
  userAddress,
  recipient,
  amount,
  tokenSymbol,
  chainId,
  "whatsapp",
  recipientPhone
);

// Update transaction status
await transactionHistoryService.updateTransactionFromExecution(
  transactionId,
  lifiExecutionStatus,
  txHash
);
```

## Database Service Methods

The `DatabaseService` provides low-level database operations:

- `saveTransactionHistory(transaction)`: Save a new transaction
- `getTransactionHistory(phone, limit, offset)`: Get user's transaction history
- `getTransactionById(id)`: Get transaction by ID
- `getTransactionByTxHash(txHash)`: Get transaction by blockchain hash
- `updateTransactionStatus(id, status, updates)`: Update transaction status
- `updateTransactionHash(id, txHash, blockNumber)`: Update transaction hash
- `getTransactionsByStatus(phone, status)`: Get transactions by status
- `getTransactionsByType(phone, type)`: Get transactions by type
- `getTransactionsByDateRange(phone, startDate, endDate)`: Get transactions by date range
- `getTransactionStats(phone)`: Get transaction statistics
- `searchTransactions(phone, searchTerm, limit)`: Search transactions
- `deleteTransactionHistory(id)`: Delete transaction (admin only)

## Transaction Status Flow

1. **pending**: Transaction is created but not yet submitted to blockchain
2. **processing**: Transaction is submitted and being processed
3. **completed**: Transaction is confirmed on blockchain
4. **failed**: Transaction failed due to error
5. **cancelled**: Transaction was cancelled by user

## Error Handling

The system includes comprehensive error handling:

- Failed transaction recordings are logged but don't break the main flow
- Retry mechanisms for temporary failures
- Detailed error messages and codes for debugging
- Graceful degradation when transaction history is unavailable

## Testing

Run the test script to verify functionality:

```bash
node test-transaction-history.js
```

This will:

1. Connect to MongoDB
2. Create a test transaction
3. Retrieve and verify the transaction
4. Test various query methods
5. Display transaction statistics

## Monitoring and Analytics

The transaction history enables:

- User transaction analytics
- Fee analysis and optimization
- Success/failure rate monitoring
- Popular token and chain tracking
- Performance metrics for different bridges and tools

## Security Considerations

- Phone numbers are used as user identifiers (ensure proper validation)
- Transaction data includes sensitive information (implement proper access controls)
- Consider data retention policies for compliance
- Implement rate limiting on history endpoints

## Future Enhancements

- Real-time transaction status updates via WebSocket
- Transaction categorization and tagging
- Export functionality (CSV, PDF)
- Advanced analytics dashboard
- Integration with external price feeds for accurate USD values
- Notification system for transaction status changes
