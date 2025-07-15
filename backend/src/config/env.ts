import { config } from "dotenv";
config({ path: `${__dirname}/../../../.env` });

export const env = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER!, // e.g., "whatsapp:+14155238886"
  AFRICAS_TALKING_API_KEY: process.env.AFRICAS_TALKING_API_KEY!,
  AFRICAS_TALKING_USERNAME: process.env.AFRICAS_TALKING_USERNAME!,
  USSD_SHORTCODE: process.env.USSD_SHORTCODE!, // e.g., "*777#"
  MONGO_URI: process.env.MONGO_URI!, // e.g., "mongodb://mongo:27017/zest"
  MANTLE_RPC_URL: process.env.MANTLE_RPC_URL!, // e.g., "https://rpc.testnet.mantle.xyz"
  MANTLE_PRIVATE_KEY: process.env.MANTLE_PRIVATE_KEY!, // Admin wallet private key
  USDC_ADDRESS: process.env.USDC_ADDRESS!, // Mantle USDC contract address
  ESCROW_ADDRESS: process.env.ESCROW_ADDRESS!, // Deployed escrow contract
};
