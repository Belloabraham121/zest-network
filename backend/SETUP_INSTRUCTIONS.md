# 🎉 Zest Wallet Backend - Setup Instructions

This guide will help you set up the Zest Wallet backend with Twilio WhatsApp and SMS integration for custodial wallet creation in Nigeria and Kenya.

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Twilio account with WhatsApp Business API access
- Mantle blockchain RPC access

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the `.env` file and update the following variables:

#### Required Twilio Configuration
```env
TWILIO_ACCOUNT_SID=your_actual_twilio_account_sid
TWILIO_AUTH_TOKEN=your_actual_twilio_auth_token
TWILIO_PHONE_NUMBER=+17402793730
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

#### Security Configuration (CRITICAL)
```env
# Generate a secure 12+ word BIP-39 mnemonic
MASTER_SEED="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

# Generate a 32-byte encryption key (64 hex characters)
ENCRYPTION_SECRET_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Your Mantle network private key for gas fees
RELAYER_PRIVATE_KEY="your_private_key_here"
```

### 3. Generate Secure Keys

#### Master Seed (BIP-39)
```javascript
// Use this Node.js script to generate a secure master seed
const bip39 = require('bip39');
const masterSeed = bip39.generateMnemonic(128); // 12 words
console.log('MASTER_SEED="' + masterSeed + '"');
```

#### Encryption Secret Key
```javascript
// Use this Node.js script to generate a 32-byte encryption key
const crypto = require('crypto');
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_SECRET_KEY="' + encryptionKey + '"');
```

### 4. Build and Start

```bash
# Build TypeScript
npm run build

# Start the server
npm start

# Development options:
# Option 1: Using ts-node-dev (fastest for development)
npm run dev

# Option 2: Using nodemon with TypeScript compilation
npm run dev:nodemon

# Option 3: Watch mode - run in separate terminals
npm run build:watch  # Terminal 1: Watch and compile TypeScript
npm run dev:watch    # Terminal 2: Watch and restart compiled JS
```

## 🔗 Twilio Webhook Configuration

### WhatsApp Business API Setup

1. **Access Twilio Console**
   - Go to [Twilio Console](https://console.twilio.com/)
   - Navigate to Messaging > Try it out > Send a WhatsApp message

2. **Configure WhatsApp Sandbox** (for testing)
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow the instructions to join your sandbox
   - Note: For production, you'll need WhatsApp Business API approval

3. **Set Webhook URL**
   - In Twilio Console, go to Messaging > Settings > WhatsApp sandbox settings
   - Set webhook URL to: `https://your-domain.com/webhooks/whatsapp/webhook`
   - For local testing with ngrok: `https://your-ngrok-url.ngrok.io/webhooks/whatsapp/webhook`

### SMS Configuration

1. **Purchase Phone Number**
   - Go to Phone Numbers > Manage > Buy a number
   - Choose a number that supports SMS

2. **Configure SMS Webhook**
   - Go to Phone Numbers > Manage > Active numbers
   - Click on your SMS number
   - Set webhook URL to: `https://your-domain.com/webhooks/sms/webhook`

## 🧪 Local Development with ngrok

### Install ngrok
```bash
# Install ngrok
npm install -g ngrok

# Or download from https://ngrok.com/
```

### Expose Local Server
```bash
# Start your local server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

### Update Twilio Webhooks
Use the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`) for your webhook URLs:
- WhatsApp: `https://abc123.ngrok.io/webhooks/whatsapp/webhook`
- SMS: `https://abc123.ngrok.io/webhooks/sms/webhook`

## 📱 Testing the Wallet Creation

### WhatsApp Testing
1. Join the Twilio WhatsApp sandbox
2. Send "CREATE" to the sandbox number
3. You should receive a wallet address and QR code

### SMS Testing
1. Send "CREATE" to your Twilio SMS number (+17402793730)
2. You should receive a wallet address and QR code via MMS

### Supported Commands
- `CREATE` - Create a new wallet
- `ADDRESS` - Get your wallet address
- `BALANCE` - Check wallet balance (placeholder)
- `HELP` - Get help information

## 🔒 Security Best Practices

### Production Environment
1. **Never commit secrets to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate encryption keys regularly**
4. **Use HTTPS in production**
5. **Implement rate limiting**
6. **Monitor for suspicious activity**

### Key Management
- Store `MASTER_SEED` and `ENCRYPTION_SECRET_KEY` securely
- Consider using AWS Secrets Manager or similar for production
- Backup encryption keys securely
- Use different keys for different environments

## 🌍 Production Deployment

### Environment Setup
1. **Deploy to cloud provider** (AWS, Google Cloud, Azure, etc.)
2. **Set up SSL/TLS certificates**
3. **Configure environment variables securely**
4. **Set up monitoring and logging**

### Twilio Production Setup
1. **Apply for WhatsApp Business API** (can take weeks)
2. **Purchase dedicated phone numbers**
3. **Configure production webhooks**
4. **Set up Twilio Studio flows** (optional)

## 🐛 Troubleshooting

### Common Issues

#### Webhook Not Receiving Messages
- Check webhook URL is publicly accessible
- Verify Twilio webhook configuration
- Check server logs for errors
- Ensure ngrok is running (for local development)

#### MongoDB Connection Issues
- Verify MONGO_URI is correct
- Check network connectivity
- Ensure MongoDB cluster allows connections

#### Twilio Authentication Errors
- Verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Check Twilio account status
- Ensure sufficient account balance

### Debug Endpoints
- Health check: `GET /health`
- WhatsApp health: `GET /webhooks/whatsapp/health`
- SMS health: `GET /webhooks/sms/health`

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| POST | `/webhooks/whatsapp/webhook` | WhatsApp messages |
| POST | `/webhooks/sms/webhook` | SMS messages |
| GET | `/webhooks/whatsapp/health` | WhatsApp service health |
| GET | `/webhooks/sms/health` | SMS service health |

## 🎯 Next Steps

1. **✅ Complete environment configuration**
2. **✅ Test wallet creation locally**
3. **✅ Deploy to staging environment**
4. **✅ Apply for WhatsApp Business API**
5. **✅ Implement additional features** (balance checking, transactions)
6. **✅ Set up monitoring and alerts**
7. **✅ Conduct security audit**

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Twilio documentation
3. Check server logs
4. Contact the development team

---

**⚠️ Important**: This is a custodial wallet system. Users' private keys are encrypted and stored on your servers. Ensure proper security measures are in place before deploying to production.