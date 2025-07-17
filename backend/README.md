# Zest Network

## Overview

Zest Network is a decentralized finance (DeFi) platform designed to make cryptocurrency accessible to users in Nigeria particularly those with feature phones and limited internet access. By leveraging Twilio's WhatsApp, SMS and USSD APIs, Zest Network enables users to create Ethereum-based wallets on the Mantle blockchain and perform gasless transactions (e.g., swaps, bridges, unstakes) through simple text-based commands.

The platform targets underserved communities, offering a custodial wallet model where the backend securely manages private keys and covers gas fees, charging users a fee in transacted tokens (e.g., USDC).

Zest Network is focusing on accessibility Nigeria. The platform supports feature phone users via SMS/MMS and smartphone users via WhatsApp, delivering QR code confirmations for transaction receipts and wallet addresses.

## Features

### 🔐 Wallet Creation

Users send "CREATE" via WhatsApp or SMS to generate a unique Ethereum wallet, derived deterministically from their phone number using BIP-39/BIP-44 standards. The backend securely stores private keys and sends QR code confirmations.

### ⛽ Gasless Transactions

Supports EIP-2612 for gasless token approvals (e.g., USDC), with the backend covering gas fees on Mantle and deducting a fee.

### 📱 WhatsApp Integration

Users interact via WhatsApp (+1 4155238886) with commands like "CREATE" or "SWAP 10 USDC DAI 9.5", receiving automated responses and QR code receipts.

### 📞 SMS/MMS Integration

Feature phone users interact via SMS (+1 7402793730), sending "CREATE" or receiving MMS confirmations with QR codes, optimized for low-end devices (e.g., MTN, Safaricom).

### 📋 Regulatory Compliance

Includes opt-out options ("Reply STOP") and consent storage to comply with Nigeria's NDPR and Kenya's DPA 2019.

### 🚀 Scalability

Designed to handle 1,000+ users with low latency (<1s for responses, <5s for MMS delivery).

### 🔒 Security

Private keys are encrypted using Node.js crypto (AES-256-GCM) with a secret key, rate limiting prevents abuse, and inputs are sanitized to avoid injection attacks.

## Target Audience

### Primary Users

- Individuals in Nigeria and Kenya, including rural users with feature phones (e.g., Nokia 3310)
- Urban users with smartphones seeking easy access to DeFi services

### Use Cases

- Creating wallets
- Sending and receiving tokens
- Swapping tokens (e.g., USDC to DAI)
- Bridging assets across chains (e.g., Mantle to Ethereum)
- Unstaking tokens via simple text commands

## Technology Stack

- **Backend**: Node.js with Express for API development and webhook handling
- **Blockchain**: ethers.js for Ethereum wallet generation and smart contract interactions on the Mantle chain (low-cost, EVM-compatible)
- **Communication**: Twilio APIs for WhatsApp and SMS/MMS, enabling text-based interactions and QR code delivery
- **Database**: MongoDB for storing wallet data (address, encrypted private key) and user consent
- **Security**: Node.js crypto module for private key encryption, rate limiting with express-rate-limit, and secure master seed storage via environment variables
- **QR Codes**: Generated using qrcode library for lightweight (<300 KB) transaction confirmations

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── controllers/
│   │   └── webhooks.controller.ts  # Webhook handlers
│   ├── services/
│   │   ├── wallet.service.ts    # Wallet creation and management
│   │   ├── database.service.ts  # Database operations
│   │   └── blockchain.service.ts # Blockchain interactions
│   ├── routes/
│   │   ├── whatsapp.ts         # WhatsApp webhook routes
│   │   ├── sms.ts              # SMS webhook routes
│   │   └── ussd.ts             # USSD routes (future)
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── index.ts                # Application entry point
├── .env                        # Environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── nodemon.json               # Development configuration
└── SETUP_INSTRUCTIONS.md      # Detailed setup guide
```

## Quick Start

### Prerequisites

- Node.js (v18+)
- MongoDB database
- Twilio account with WhatsApp and SMS capabilities

### Installation

1. **Clone and install dependencies**:

   ```bash
   git clone <repository-url>
   cd zest-network/backend
   npm install
   ```

2. **Configure environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:

   ```bash
   npm run dev:nodemon
   ```

4. **Test the health endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

## Environment Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration
MONGO_URI=mongodb://localhost:27017/zest_db

# Server Configuration
PORT=3000

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+17402793730
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Blockchain Configuration
MANTLE_RPC_URL=https://rpc.mantle.xyz
RELAYER_PRIVATE_KEY=your_relayer_private_key

# Wallet Security Configuration
MASTER_SEED="your_bip39_mnemonic_phrase_here"
ENCRYPTION_SECRET_KEY="your_32_byte_hex_encryption_key"

# Contract Addresses
USDC_CONTRACT_ADDRESS=your_usdc_contract_address
ESCROW_CONTRACT_ADDRESS=your_escrow_contract_address
```

**Security Note**: Generate secure keys using:

```javascript
const crypto = require("crypto");
console.log(crypto.randomBytes(32).toString("hex"));
```

## API Endpoints

### Health Check

- **GET** `/health` - Server health status and available endpoints

### Webhooks

- **POST** `/webhooks/whatsapp/webhook` - WhatsApp message webhook
- **POST** `/webhooks/sms/webhook` - SMS message webhook
- **POST** `/webhooks/ussd/webhook` - USSD webhook (future)

## Supported Commands

### Wallet Management

- `CREATE` / `WALLET` / `START` - Create a new wallet
- `BALANCE` / `BAL` - Check wallet balance
- `ADDRESS` / `ADDR` - Get wallet address
- `HELP` / `COMMANDS` - Show available commands

### Transaction Commands (Coming Soon)

- `SWAP <amount> <from_token> <to_token> <min_amount>` - Token swaps
- `BRIDGE <amount> <token> <to_chain>` - Cross-chain bridges
- `UNSTAKE <amount> <token>` - Unstake tokens

## Twilio Setup

### 1. WhatsApp Configuration

1. Sign up or log in to [Twilio Console](https://console.twilio.com)
2. Register WhatsApp Business API for +1 4155238886
3. Submit business profile to Meta (1–2 weeks approval)
4. Configure webhook: `https://your-backend.com/webhooks/whatsapp/webhook`

### 2. SMS Configuration

1. Configure SMS/MMS for +1 7402793730
2. Ensure compatibility with Nigeria (+234) and Kenya (+254)
3. Configure webhook: `https://your-backend.com/webhooks/sms/webhook`

### 3. Message Templates

Create WhatsApp message templates for transactional responses:

- "Wallet created: {{1}}"
- "Transaction completed: {{1}}"

## Testing

### Development Testing

```bash
# Test WhatsApp webhook
curl -X POST http://localhost:3000/webhooks/whatsapp/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=CREATE&From=whatsapp:+1234567890&To=whatsapp:+14155238886"

# Test SMS webhook
curl -X POST http://localhost:3000/webhooks/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=CREATE&From=+1234567890&To=+17402793730"
```

### Production Testing

1. Simulate 100 users sending "CREATE" via WhatsApp and SMS
2. Verify wallet creation and QR code delivery (<300 KB)
3. Test feature phone compatibility (MTN, Safaricom)
4. Validate security (input sanitization, rate limiting)
5. Check performance (response <1s, MMS <5s)

## Security Features

- **Private Key Encryption**: AES-256-GCM encryption with secure key storage
- **Rate Limiting**: 5 requests/user/hour for webhook endpoints
- **Input Sanitization**: Prevents injection attacks
- **Deterministic Wallets**: BIP-39/BIP-44 compliant wallet generation
- **Secure Communication**: HTTPS-only webhook endpoints

## Regulatory Compliance

- **Opt-out Flows**: "Reply STOP" for SMS/WhatsApp messages
- **Consent Storage**: Database storage for user consent
- **Nigeria NCC Compliance**: National Communications Commission regulations
- **Kenya CA Compliance**: Communications Authority regulations
- **Data Protection**: NDPR (Nigeria) and DPA 2019 (Kenya) compliance

## Success Metrics

- **User Adoption**: 80% of 1,000 MVP users create wallets via WhatsApp/SMS
- **Engagement**: 90% MMS open rates, 70% command completion rate
- **Cost Efficiency**: Twilio costs ($0.004–$0.025 WhatsApp, $0.06–$0.10 MMS) and gas fees (<$0.05 on Mantle) offset by 1% token fees
- **Performance**: <1s for message responses, <5s for MMS delivery
- **Security**: Zero private key leaks or injection vulnerabilities

## Roadmap

### Phase 1: MVP (Current)

- ✅ Wallet creation via WhatsApp/SMS
- ✅ QR code generation and delivery
- ✅ Basic security and rate limiting
- ✅ MongoDB integration

### Phase 2: DeFi Integration

- 🔄 Token swaps (USDC ↔ DAI)
- 🔄 Cross-chain bridges
- 🔄 Gasless transactions with EIP-2612
- 🔄 Escrow contract integration

### Phase 3: Enhanced Access

- 📋 USSD integration for broader feature phone access
- 📋 Africa's Talking API integration
- 📋 Enhanced telco partnerships

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Add your license here]

## Support

For support and questions:

- 📧 Email: [your-email@domain.com]
- 💬 WhatsApp: +1 4155238886
- 📱 SMS: +1 7402793730

---

**Zest Network** - Making DeFi accessible to everyone, everywhere. 🌍
