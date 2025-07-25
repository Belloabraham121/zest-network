import { config } from "dotenv";
config({ path: `${__dirname}/../../../.env` });

export const env = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!, // SMS number e.g., "+17402793730"
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER!, // e.g., "whatsapp:+14155238886"
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY!,
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME!,
  USSD_SHORTCODE: process.env.USSD_SHORTCODE!, // e.g., "*777#"
  MONGO_URI: process.env.MONGO_URI!, // e.g., "mongodb://mongo:27017/zest"
  MANTLE_RPC_URL: process.env.MANTLE_RPC_URL!, // e.g., "https://sepolia.mantlescan.xyz/"
  MANTLE_CHAIN_ID: parseInt(process.env.MANTLE_CHAIN_ID || "5003"), // Mantle chain ID (5003 for Sepolia testnet)
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY!, // Relayer wallet private key
  MASTER_SEED: process.env.MASTER_SEED!, // BIP39 master seed for deterministic wallet generation
  ENCRYPTION_SECRET_KEY: process.env.ENCRYPTION_SECRET_KEY!, // 32-byte key for AES-256-GCM encryption
  USDC_ADDRESS: process.env.USDC_ADDRESS!, // Mantle USDC contract address
  ESCROW_ADDRESS: process.env.ESCROW_ADDRESS!, // Deployed escrow contract
  // LI.FI Configuration
  LIFI_API_URL: process.env.LIFI_API_URL || "https://li.quest/v1",
  LIFI_INTEGRATOR: process.env.LIFI_INTEGRATOR || "zest-network",
  LIFI_API_KEY: process.env.LIFI_API_KEY,
  LIFI_SLIPPAGE_TOLERANCE: parseFloat(
    process.env.LIFI_SLIPPAGE_TOLERANCE || "0.03"
  ),
  LIFI_ENABLE_SIMULATION: process.env.LIFI_ENABLE_SIMULATION === "true",
  LIFI_CACHE_TTL: parseInt(process.env.LIFI_CACHE_TTL || "300"),
};
