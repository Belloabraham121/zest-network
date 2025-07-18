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
