import { ethers } from "ethers";
import * as crypto from "crypto";
import * as bip39 from "bip39";
import QRCode from "qrcode";
import twilio from "twilio";
import { env } from "../config/env";
import { DatabaseService } from "./database.service";
import { Wallet } from "../types";

// TODO: ✅ Task 1: Implement deterministic wallet generation
// TODO: ✅ Task 2: Implement AES-256-GCM encryption for private keys
// TODO: ✅ Task 3: Implement QR code generation
// TODO: ✅ Task 4: Implement Twilio WhatsApp/SMS integration
// TODO: ✅ Task 5: Implement wallet creation workflow

export class WalletService {
  private dbService: DatabaseService;
  private twilioClient: twilio.Twilio | null;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.dbService = new DatabaseService();
    
    // Initialize Twilio client with validation
    try {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || 
          env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid_here' ||
          env.TWILIO_AUTH_TOKEN === 'your_twilio_auth_token_here') {
        console.warn('⚠️  Twilio credentials not configured. SMS/WhatsApp features will be disabled.');
        this.twilioClient = null;
      } else {
        this.twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        console.log('✅ Twilio client initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error);
      this.twilioClient = null;
    }
    
    this.provider = new ethers.JsonRpcProvider(env.MANTLE_RPC_URL);
  }

  // ✅ Task 1: Generate deterministic wallet from phone number
  private generateDeterministicWallet(phoneNumber: string): ethers.HDNodeWallet {
    try {
      // Validate master seed
      if (!bip39.validateMnemonic(env.MASTER_SEED)) {
        throw new Error("Invalid master seed mnemonic");
      }

      // Create master HD node from seed
      const seed = bip39.mnemonicToSeedSync(env.MASTER_SEED);
      const masterNode = ethers.HDNodeWallet.fromSeed(seed);

      // Generate deterministic index from phone number using keccak256
      const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phoneNumber));
      const index = BigInt(phoneHash) % BigInt(2147483647); // Keep within valid range

      // Derive wallet using BIP-44 path: m/44'/60'/0'/0/<index>
      const derivationPath = `m/44'/60'/0'/0/${index.toString()}`;
      const wallet = masterNode.derivePath(derivationPath);

      console.log(`Generated wallet for ${phoneNumber} at path: ${derivationPath}`);
      return wallet;
    } catch (error) {
      console.error("Error generating deterministic wallet:", error);
      throw new Error("Failed to generate wallet");
    }
  }

  // ✅ Task 2: Encrypt private key using AES-256-GCM
  private encryptPrivateKey(privateKey: string): { encryptedData: string; iv: string; authTag: string } {
    try {
      const algorithm = "aes-256-gcm";
      const secretKey = Buffer.from(env.ENCRYPTION_SECRET_KEY, "hex");
      
      if (secretKey.length !== 32) {
        throw new Error("Encryption secret key must be 32 bytes (64 hex characters)");
      }

      const iv = crypto.randomBytes(16); // 128-bit IV for GCM
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      cipher.setAAD(Buffer.from("wallet-encryption", "utf8")); // Additional authenticated data

      let encrypted = cipher.update(privateKey, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex")
      };
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw new Error("Failed to encrypt private key");
    }
  }

  // Decrypt private key using AES-256-GCM
  private decryptPrivateKey(encryptedData: string, iv: string, authTag: string): string {
    try {
      const algorithm = "aes-256-gcm";
      const secretKey = Buffer.from(env.ENCRYPTION_SECRET_KEY, "hex");
      const ivBuffer = Buffer.from(iv, "hex");
      
      const decipher = crypto.createDecipheriv(algorithm, secretKey, ivBuffer);
      decipher.setAAD(Buffer.from("wallet-encryption", "utf8"));
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Error decrypting private key:", error);
      throw new Error("Failed to decrypt private key");
    }
  }

  // ✅ Task 3: Generate QR code for wallet address
  private async generateQRCode(walletAddress: string): Promise<string> {
    try {
      const qrData = {
        address: walletAddress,
        network: "Mantle",
        chainId: 5000
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: "M",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        },
        width: 256 // Keep under 300KB for feature phones
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error("Error generating QR code:", error);
      throw new Error("Failed to generate QR code");
    }
  }

  // ✅ Task 4: Send WhatsApp message with wallet details
  private async sendWhatsAppMessage(to: string, walletAddress: string, qrCodeDataURL: string): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn('Twilio client not available, skipping WhatsApp message');
        return;
      }

      const message = `🎉 Wallet Created Successfully!\n\n` +
        `Your Mantle wallet address:\n${walletAddress}\n\n` +
        `Network: Mantle (Chain ID: 5000)\n` +
        `You can now receive USDC and other tokens!\n\n` +
        `Save this address safely. Reply HELP for more commands.`;

      // Send text message first
      await this.twilioClient.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: message
      });

      // Send QR code as media
      await this.twilioClient.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: "📱 Scan this QR code to share your wallet address:",
        mediaUrl: [qrCodeDataURL]
      });

      console.log(`WhatsApp messages sent to ${to}`);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw new Error("Failed to send WhatsApp message");
    }
  }

  // ✅ Task 4: Send SMS message with wallet details
  private async sendSMSMessage(to: string, walletAddress: string, qrCodeDataURL: string): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn('Twilio client not available, skipping SMS message');
        return;
      }

      const message = `🎉 Zest Wallet Created!\n\n` +
        `Address: ${walletAddress}\n\n` +
        `Network: Mantle\n` +
        `You can now receive USDC!\n\n` +
        `Reply HELP for commands.`;

      // Send text message
      await this.twilioClient.messages.create({
        from: env.TWILIO_PHONE_NUMBER,
        to: to,
        body: message
      });

      // Send QR code as MMS for smartphones
      try {
        await this.twilioClient.messages.create({
          from: env.TWILIO_PHONE_NUMBER,
          to: to,
          body: "QR Code for your wallet:",
          mediaUrl: [qrCodeDataURL]
        });
      } catch (mmsError) {
        console.log("MMS not supported, sent text only");
      }

      console.log(`SMS sent to ${to}`);
    } catch (error) {
      console.error("Error sending SMS:", error);
      throw new Error("Failed to send SMS");
    }
  }

  // Sanitize phone number input
  private sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^+\d]/g, "");
    
    // Validate format
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      throw new Error("Invalid phone number format");
    }
    
    return cleaned;
  }

  // ✅ Task 5: Main wallet creation workflow
  async createWallet(phoneNumber: string, channel: "whatsapp" | "sms"): Promise<{ success: boolean; message: string; address?: string }> {
    try {
      // Sanitize input
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);
      
      // Check if wallet already exists
      const existingWallet = await this.dbService.walletExists(sanitizedPhone);
      if (existingWallet) {
        return {
          success: false,
          message: "Wallet already exists for this phone number. Reply BALANCE to check your wallet."
        };
      }

      // Generate deterministic wallet
      const wallet = this.generateDeterministicWallet(sanitizedPhone);
      
      // Encrypt private key
      const { encryptedData, iv, authTag } = this.encryptPrivateKey(wallet.privateKey);
      
      // Create wallet object
      const walletData: Wallet = {
        phone: sanitizedPhone,
        address: wallet.address,
        encryptedPrivateKey: encryptedData,
        iv: iv,
        authTag: authTag,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.dbService.saveWallet(walletData);
      
      // Generate QR code
      const qrCodeDataURL = await this.generateQRCode(wallet.address);
      
      // Send confirmation based on channel (non-blocking for testing)
      try {
        if (channel === "whatsapp") {
          await this.sendWhatsAppMessage(sanitizedPhone, wallet.address, qrCodeDataURL);
        } else {
          await this.sendSMSMessage(sanitizedPhone, wallet.address, qrCodeDataURL);
        }
      } catch (messageError) {
        console.warn(`Failed to send ${channel} message, but wallet was created successfully:`, messageError);
        // Continue with success - wallet creation succeeded even if messaging failed
      }

      console.log(`✅ Wallet created successfully for ${sanitizedPhone}`);
      
      return {
        success: true,
        message: "Wallet created successfully! Check your messages for details.",
        address: wallet.address
      };
    } catch (error) {
      console.error("Error creating wallet:", error);
      return {
        success: false,
        message: "Failed to create wallet. Please try again later."
      };
    }
  }

  // Get wallet by phone number
  async getWallet(phoneNumber: string): Promise<Wallet | null> {
    try {
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);
      return await this.dbService.getWallet(sanitizedPhone);
    } catch (error) {
      console.error("Error getting wallet:", error);
      return null;
    }
  }

  // Get decrypted private key (use with caution)
  async getDecryptedPrivateKey(phoneNumber: string): Promise<string | null> {
    try {
      const wallet = await this.getWallet(phoneNumber);
      if (!wallet) return null;
      
      return this.decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);
    } catch (error) {
      console.error("Error decrypting private key:", error);
      return null;
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();