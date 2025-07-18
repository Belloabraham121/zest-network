# Zest: WhatsApp + USSD DeFi for Nigeria

Send, receive, and check USDC balances via WhatsApp or USSD — no wallet app, seed phrase, or browser needed.

## 🎯 Vision

Make DeFi accessible to everyone in Nigeria through familiar channels:
- **WhatsApp**: For smartphone users with data connectivity.
- **USSD**: For feature phone users without data.

## 🏗 Architecture

```
WhatsApp User       USSD User
       |                |
Twilio API      Africa's Talking
       |                |
        ↘            ↙
         Backend (Express.js)
           ├─ Wallet Service
           ├─ Blockchain Service
           └─ Database Service
                |
    Mantle Blockchain
         └─ Escrow Contract
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Docker (recommended)
- Twilio account (WhatsApp)
- Africa’s Talking account (USSD)
- Mantle testnet access

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zest

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit backend/.env with your configuration

# Start MongoDB (via Docker)
cd ../docker
docker-compose up -d

# Start development server
cd ../backend
npm run dev
```

## 📁 Project Structure

```
zest/
├── backend/                    # Express.js backend
│   ├── src/
│   │   ├── index.ts           # Entry point (starts server)
│   │   ├── routes/            # API routes
│   │   │   ├── whatsapp.ts    # Twilio webhook
│   │   │   └── ussd.ts       # Africa's Talking webhook
│   │   ├── services/          # Business logic
│   │   │   ├── wallet.service.ts  # Wallet management
│   │   │   ├── blockchain.service.ts # ethers.js for Mantle
│   │   │   └── database.service.ts # MongoDB operations
│   │   ├── config/            # Configuration
│   │   │   ├── env.ts         # Environment variables
│   │   │   └── constants.ts   # App constants
│   │   ├── types/             # TypeScript interfaces
│   │   │   └── index.ts       # Wallet, Transaction, Payloads
│   │   ├── tests/             # Unit/integration tests
│   │   │   ├── whatsapp.test.ts
│   │   │   ├── ussd.test.ts
│   │   │   └── wallet.test.ts
│   ├── package.json           # Backend dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── .env                   # Environment variables
├── contracts/                 # Smart contracts
│   ├── src/
│   │   ├── Escrow.sol        # Escrow for USDC transfers
│   │   └── interfaces/
│   ├── scripts/
│   │   └── deploy.ts         # Hardhat deployment
│   ├── hardhat.config.ts     # Hardhat config for Mantle
│   └── package.json           # Hardhat dependencies
├── docker/                    # Docker configuration
│   ├── Dockerfile            # Backend container
│   └── docker-compose.yml    # Backend, MongoDB
├── docs/                      # Documentation
│   ├── api.md                # API endpoints
│   └── flows.md              # User flows
├── .gitignore                 # Git ignore
├── README.md                  # Project overview
└── package.json               # Monorepo root (optional)
```

## 🔧 Core Features (MVP)

### WhatsApp Features
- ✅ Send USDC by phone number (e.g., “Send 10 USDC to +234…”)
- ✅ Create custodial wallet automatically
- ✅ Check balance (e.g., “Balance”)
- ✅ Receive USDC (notified via WhatsApp)

### USSD Features
- ✅ Send USDC by phone number (e.g., `*777*1*10*0803xxx#`)
- ✅ Create custodial wallet automatically
- ✅ Check balance (e.g., `*777*2#`)
- ✅ Receive USDC (notified via SMS)

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Blockchain**: ethers.js for Mantle integration

### Smart Contracts
- **Language**: Solidity
- **Framework**: Hardhat
- **Network**: Mantle Network (testnet for MVP)

### Integrations
- **WhatsApp**: Twilio
- **USSD**: Africa’s Talking

## 📋 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Africa's Talking (USSD)
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
USSD_SHORTCODE=*777#

# MongoDB
MONGO_URI=mongodb://mongo:27017/zest

# Mantle Blockchain
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
MANTLE_PRIVATE_KEY=your_private_key
USDC_ADDRESS=0x...
ESCROW_ADDRESS=0x...
```

## 🚀 Development

```bash
# Start MongoDB
cd docker
docker-compose up -d

# Start backend development server
cd ../backend
npm run dev

# Run backend tests
npm run test

# Deploy smart contracts (Mantle testnet)
cd ../contracts
npm run deploy:contracts
```

## 📚 API Documentation

See `docs/api.md` for webhook endpoints (`/whatsapp/incoming`, `/ussd/incoming`).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/xyz`)
3. Make changes and add tests
4. Commit (`git commit -m "Add feature XYZ"`)
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.