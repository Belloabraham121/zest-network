// Wallet interface for custodial wallet data with encryption
export interface Wallet {
  phone: string; // e.g., "+2348123456789"
  address: string; // Ethereum address, e.g., "0x123..."
  encryptedPrivateKey: string; // AES-256-GCM encrypted private key
  iv: string; // Initialization vector for encryption
  authTag: string; // Authentication tag for GCM mode
  createdAt?: Date;
  updatedAt?: Date;
}

// User consent interface for tracking agreements
export interface UserConsent {
  phone: string; // User's phone number
  hasAgreedToTerms: boolean; // Whether user agreed to terms
  consentTimestamp: Date; // When consent was given
  ipAddress?: string; // Optional IP address
  userAgent?: string; // Optional user agent
}

// Transaction interface for USDC transfers
export interface Transaction {
  txId: string; // Unique transaction ID (e.g., keccak256 hash)
  sender: string; // Sender phone or address
  recipient: string; // Recipient phone or address
  amount: number; // USDC amount (e.g., 10)
  token: string; // Token type (e.g., "USDC")
  status: "pending" | "escrowed" | "completed" | "failed"; // Transaction status
  timestamp: number; // Unix timestamp
}

// WhatsApp incoming message payload (Twilio)
export interface WhatsappPayload {
  Body: string; // e.g., "Send 10 USDC to +2348123456789"
  From: string; // Sender phone, e.g., "whatsapp:+234..."
  To: string; // Twilio WhatsApp number
}

// USSD incoming payload (Africa's Talking)
export interface UssdPayload {
  sessionId: string; // Unique session ID
  phoneNumber: string; // e.g., "+2348031234567"
  text: string; // e.g., "1*10*08031234567"
}

// LI.FI Types
export interface LiFiQuoteRequest {
  fromChain: string | number;
  toChain: string | number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
  slippage?: number;
  allowBridges?: string[];
  denyBridges?: string[];
  allowExchanges?: string[];
  denyExchanges?: string[];
}

export interface LiFiQuoteResponse {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    fromAmount: string;
    fromToken: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      name: string;
      logoURI?: string;
    };
    toChainId: number;
    toToken: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      name: string;
      logoURI?: string;
    };
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{
      name: string;
      description: string;
      token: {
        address: string;
        chainId: number;
        symbol: string;
        decimals: number;
        name: string;
      };
      amount: string;
      amountUSD: string;
      percentage: string;
      included: boolean;
    }>;
    gasCosts: Array<{
      type: string;
      price: string;
      estimate: string;
      limit: string;
      amount: string;
      amountUSD: string;
      token: {
        address: string;
        chainId: number;
        symbol: string;
        decimals: number;
        name: string;
      };
    }>;
  };
  includedSteps: LiFiStep[];
  transactionRequest?: {
    data: string;
    to: string;
    value: string;
    from?: string;
    chainId: number;
    gasLimit?: string;
    gasPrice?: string;
  };
}

export interface LiFiStep {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    fromAmount: string;
    fromToken: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      name: string;
    };
    toChainId: number;
    toToken: {
      address: string;
      chainId: number;
      symbol: string;
      decimals: number;
      name: string;
    };
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
  };
  toolDetails: {
    key: string;
    name: string;
    logoURI: string;
  };
}

export interface LiFiExecutionStatus {
  status: "NOT_FOUND" | "INVALID" | "PENDING" | "DONE" | "FAILED" | "CANCELLED";
  substatus?: string;
  substatusMessage?: string;
  txHash?: string;
  txLink?: string;
  fromAmount?: string;
  toAmount?: string;
  gasUsed?: string;
  gasPrice?: string;
  gasFee?: string;
  timestamp?: number;
}

export interface LiFiChain {
  id: number;
  key: string;
  name: string;
  coin: string;
  mainnet: boolean;
  logoURI: string;
  tokenlistUrl: string;
  multicallAddress: string;
  metamask: {
    chainId: string;
    blockExplorerUrls: string[];
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
  };
}

export interface LiFiToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
}

export interface CrossChainTransfer {
  id: string;
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  sender: string;
  recipient: string;
  status: "pending" | "bridging" | "completed" | "failed";
  txHash?: string;
  bridgeTxHash?: string;
  destinationTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedTime?: number;
  actualTime?: number;
}

// Transaction History interface for comprehensive transaction tracking
export interface TransactionHistory {
  id: string; // Unique transaction ID
  userPhone: string; // User's phone number
  userAddress: string; // User's wallet address
  type: "transfer" | "swap" | "bridge"; // Transaction type
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"; // Transaction status

  // Token information
  fromToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
    amount: string; // Amount in token units
    amountUSD?: string; // USD value at time of transaction
  };

  toToken?: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
    amount: string; // Expected/actual amount received
    amountUSD?: string; // USD value at time of transaction
  };

  // Chain information
  fromChain: {
    id: number;
    name: string;
    symbol: string;
  };

  toChain?: {
    id: number;
    name: string;
    symbol: string;
  };

  // Transaction details
  recipient?: string; // Recipient address (for transfers)
  recipientPhone?: string; // Recipient phone (for transfers)

  // Blockchain transaction hashes
  txHash?: string; // Main transaction hash
  bridgeTxHash?: string; // Bridge transaction hash (for cross-chain)
  destinationTxHash?: string; // Destination chain transaction hash

  // LI.FI specific data
  lifiRouteId?: string; // LI.FI route ID
  lifiTool?: string; // Bridge/DEX tool used (e.g., "stargate", "hop")

  // Fee information
  fees: {
    gas: {
      amount: string;
      amountUSD?: string;
      token: string;
    };
    bridge?: {
      amount: string;
      amountUSD?: string;
      token: string;
      percentage?: string;
    };
    protocol?: {
      amount: string;
      amountUSD?: string;
      token: string;
      percentage?: string;
    };
  };

  // Timing information
  createdAt: Date; // When transaction was initiated
  updatedAt: Date; // Last update timestamp
  completedAt?: Date; // When transaction was completed
  estimatedDuration?: number; // Estimated time in seconds
  actualDuration?: number; // Actual time taken in seconds

  // Error information
  errorMessage?: string; // Error message if failed
  errorCode?: string; // Error code if failed

  // Metadata
  initiatedVia: "whatsapp" | "sms" | "ussd" | "api"; // How transaction was initiated
  slippage?: number; // Slippage tolerance used
  priceImpact?: string; // Price impact percentage

  // Block information
  blockNumber?: number;
  blockTimestamp?: number;

  // Additional context
  notes?: string; // Any additional notes
  tags?: string[]; // Tags for categorization
}
