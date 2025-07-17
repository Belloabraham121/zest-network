import { ethers } from "ethers";
import * as crypto from "crypto";
import * as bip39 from "bip39";
import QRCode from "qrcode";
import twilio from "twilio";
import { env } from "../config/env";
import { DatabaseService } from "./database.service";
import { Wallet } from "../types";

export class WalletService {
  private dbService: DatabaseService;
  private twilioClient: twilio.Twilio | null;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.dbService = new DatabaseService();

    try {
      if (
        !env.TWILIO_ACCOUNT_SID ||
        !env.TWILIO_AUTH_TOKEN ||
        env.TWILIO_ACCOUNT_SID === "your_twilio_account_sid_here" ||
        env.TWILIO_AUTH_TOKEN === "your_twilio_auth_token_here"
      ) {
        console.warn(
          "⚠️  Twilio credentials not configured. SMS/WhatsApp features will be disabled."
        );
        this.twilioClient = null;
      } else {
        this.twilioClient = twilio(
          env.TWILIO_ACCOUNT_SID,
          env.TWILIO_AUTH_TOKEN
        );
        console.log("✅ Twilio client initialized successfully");
      }
    } catch (error) {
      console.error("❌ Failed to initialize Twilio client:", error);
      this.twilioClient = null;
    }

    this.provider = new ethers.JsonRpcProvider(env.MANTLE_RPC_URL);
  }

  private generateDeterministicWallet(
    phoneNumber: string
  ): ethers.HDNodeWallet {
    try {
      if (!bip39.validateMnemonic(env.MASTER_SEED)) {
        throw new Error("Invalid master seed mnemonic");
      }

      const seed = bip39.mnemonicToSeedSync(env.MASTER_SEED);
      const masterNode = ethers.HDNodeWallet.fromSeed(seed);

      const phoneHash = ethers.keccak256(ethers.toUtf8Bytes(phoneNumber));
      const index = BigInt(phoneHash) % BigInt(2147483647); // Keep within valid range

      // Derive wallet using BIP-44 path: m/44'/60'/0'/0/<index>
      const derivationPath = `m/44'/60'/0'/0/${index.toString()}`;
      const wallet = masterNode.derivePath(derivationPath);

      console.log(
        `Generated wallet for ${phoneNumber} at path: ${derivationPath}`
      );
      return wallet;
    } catch (error) {
      console.error("Error generating deterministic wallet:", error);
      throw new Error("Failed to generate wallet");
    }
  }

  private encryptPrivateKey(privateKey: string): {
    encryptedData: string;
    iv: string;
    authTag: string;
  } {
    try {
      const algorithm = "aes-256-gcm";
      const secretKey = Buffer.from(env.ENCRYPTION_SECRET_KEY, "hex");

      if (secretKey.length !== 32) {
        throw new Error(
          "Encryption secret key must be 32 bytes (64 hex characters)"
        );
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
      cipher.setAAD(Buffer.from("wallet-encryption", "utf8")); // Additional authenticated data

      let encrypted = cipher.update(privateKey, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      console.error("Error encrypting private key:", error);
      throw new Error("Failed to encrypt private key");
    }
  }

  private decryptPrivateKey(
    encryptedData: string,
    iv: string,
    authTag: string
  ): string {
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

  private async generateQRCode(walletAddress: string): Promise<string> {
    try {
      const qrData = {
        address: walletAddress,
        network: "Mantle",
        chainId: 5000,
      };

      const qrText = encodeURIComponent(JSON.stringify(qrData));
      const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?data=${qrText}&size=300x300&format=png&margin=1&ecc=M&color=0-0-0&bgcolor=255-255-255&qzone=1`;

      const response = await fetch(qrCodeURL, { method: "HEAD" });
      if (!response.ok) {
        throw new Error(`QR code service returned status: ${response.status}`);
      }

      console.log(`✅ QR code generated successfully: ${qrCodeURL}`);
      return qrCodeURL;
    } catch (error) {
      console.error("Error generating QR code:", error);

      try {
        const fallbackQrText = encodeURIComponent(walletAddress);
        const fallbackQrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?data=${fallbackQrText}&size=300x300&format=png&margin=1&ecc=M&color=0-0-0&bgcolor=255-255-255&qzone=1`;

        const fallbackResponse = await fetch(fallbackQrCodeURL, {
          method: "HEAD",
        });
        if (!fallbackResponse.ok) {
          throw new Error(
            `Fallback QR code service returned status: ${fallbackResponse.status}`
          );
        }

        console.log(
          `✅ Fallback QR code generated successfully: ${fallbackQrCodeURL}`
        );
        return fallbackQrCodeURL;
      } catch (fallbackError) {
        console.error(
          "Fallback QR code generation also failed:",
          fallbackError
        );
        throw new Error("Failed to generate QR code");
      }
    }
  }

  private async sendWhatsAppMessage(
    to: string,
    walletAddress: string,
    qrCodeDataURL: string
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping WhatsApp message");
        return;
      }

      const message =
        `🎉 Wallet Created Successfully!\n\n` +
        `Your Mantle wallet address:\n${walletAddress}\n\n` +
        `Network: Mantle (Chain ID: 5000)\n` +
        `You can now receive USDC and other tokens!\n\n` +
        `Save this address safely. Reply HELP for more commands.`;

      await this.twilioClient.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: message,
      });

      await this.twilioClient.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: "📱 Scan this QR code to share your wallet address:",
        mediaUrl: [qrCodeDataURL],
      });

      console.log(`WhatsApp messages sent to ${to}`);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw new Error("Failed to send WhatsApp message");
    }
  }

  private async sendSMSMessage(
    to: string,
    walletAddress: string,
    qrCodeDataURL: string
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping SMS message");
        return;
      }

      const message =
        `🎉 Zest Wallet Created!\n\n` +
        `Address: ${walletAddress}\n\n` +
        `Network: Mantle\n` +
        `You can now receive USDC!\n\n` +
        `Reply HELP for commands.`;

      await this.twilioClient.messages.create({
        from: env.TWILIO_PHONE_NUMBER,
        to: to,
        body: message,
      });

      try {
        await this.twilioClient.messages.create({
          from: env.TWILIO_PHONE_NUMBER,
          to: to,
          body: "QR Code for your wallet:",
          mediaUrl: [qrCodeDataURL],
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

  private async sendWhatsAppQR(
    to: string,
    walletAddress: string,
    qrCodeDataURL: string
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping WhatsApp QR");
        return;
      }

      await this.twilioClient.messages.create({
        from: env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: `📱 QR Code for your Mantle wallet:\n\nAddress: ${walletAddress}\nNetwork: Mantle (Chain ID: 5000)\n\nScan to share your wallet address!`,
        mediaUrl: [qrCodeDataURL],
      });

      console.log(`WhatsApp QR code sent to ${to}`);
    } catch (error) {
      console.error("Error sending WhatsApp QR:", error);
      throw new Error("Failed to send WhatsApp QR");
    }
  }

  private async sendSMSQR(
    to: string,
    walletAddress: string,
    qrCodeDataURL: string
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping SMS QR");
        return;
      }

      try {
        await this.twilioClient.messages.create({
          from: env.TWILIO_PHONE_NUMBER,
          to: to,
          body: `📱 QR Code for your Mantle wallet:\n\nAddress: ${walletAddress}\nNetwork: Mantle\n\nScan to share your address!`,
          mediaUrl: [qrCodeDataURL],
        });
      } catch (mmsError) {
        await this.twilioClient.messages.create({
          from: env.TWILIO_PHONE_NUMBER,
          to: to,
          body: `📱 Your Mantle wallet:\n\nAddress: ${walletAddress}\nNetwork: Mantle\n\nQR code delivery failed. Use address above.`,
        });
        console.log("MMS not supported, sent text only");
      }

      console.log(`SMS QR code sent to ${to}`);
    } catch (error) {
      console.error("Error sending SMS QR:", error);
      throw new Error("Failed to send SMS QR");
    }
  }

  private sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^+\d]/g, "");

    // Validate format
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      throw new Error("Invalid phone number format");
    }

    return cleaned;
  }

  async createWallet(
    phoneNumber: string,
    channel: "whatsapp" | "sms"
  ): Promise<{ success: boolean; message: string; address?: string }> {
    try {
      // Sanitize input
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);

      // Check if wallet already exists
      const existingWallet = await this.dbService.walletExists(sanitizedPhone);
      if (existingWallet) {
        return {
          success: false,
          message:
            "Wallet already exists for this phone number. Reply BALANCE to check your wallet.",
        };
      }

      // Generate deterministic wallet
      const wallet = this.generateDeterministicWallet(sanitizedPhone);

      // Encrypt private key
      const { encryptedData, iv, authTag } = this.encryptPrivateKey(
        wallet.privateKey
      );

      // Create wallet object
      const walletData: Wallet = {
        phone: sanitizedPhone,
        address: wallet.address,
        encryptedPrivateKey: encryptedData,
        iv: iv,
        authTag: authTag,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database
      await this.dbService.saveWallet(walletData);

      // Generate QR code
      const qrCodeDataURL = await this.generateQRCode(wallet.address);

      // Send confirmation based on channel (non-blocking for testing)
      try {
        if (channel === "whatsapp") {
          await this.sendWhatsAppMessage(
            sanitizedPhone,
            wallet.address,
            qrCodeDataURL
          );
        } else {
          await this.sendSMSMessage(
            sanitizedPhone,
            wallet.address,
            qrCodeDataURL
          );
        }
      } catch (messageError) {
        console.warn(
          `Failed to send ${channel} message, but wallet was created successfully:`,
          messageError
        );
      }

      console.log(`✅ Wallet created successfully for ${sanitizedPhone}`);

      return {
        success: true,
        message:
          "Wallet created successfully! Check your messages for details.",
        address: wallet.address,
      };
    } catch (error) {
      console.error("Error creating wallet:", error);
      return {
        success: false,
        message: "Failed to create wallet. Please try again later.",
      };
    }
  }

  async getWallet(phoneNumber: string): Promise<Wallet | null> {
    try {
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);
      return await this.dbService.getWallet(sanitizedPhone);
    } catch (error) {
      console.error("Error getting wallet:", error);
      return null;
    }
  }

  async generateWalletQR(
    walletAddress: string
  ): Promise<{ success: boolean; qrCodeDataURL?: string; message?: string }> {
    try {
      const qrCodeDataURL = await this.generateQRCode(walletAddress);
      return {
        success: true,
        qrCodeDataURL: qrCodeDataURL,
      };
    } catch (error) {
      console.error("Error generating wallet QR code:", error);
      return {
        success: false,
        message: "Failed to generate QR code",
      };
    }
  }

  async sendWalletQR(
    phoneNumber: string,
    channel: "whatsapp" | "sms"
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);
      const wallet = await this.dbService.getWallet(sanitizedPhone);

      if (!wallet) {
        return {
          success: false,
          message: "No wallet found for this phone number",
        };
      }

      try {
        const qrCodeDataURL = await this.generateQRCode(wallet.address);

        if (channel === "whatsapp") {
          await this.sendWhatsAppQR(
            sanitizedPhone,
            wallet.address,
            qrCodeDataURL
          );
        } else {
          await this.sendSMSQR(sanitizedPhone, wallet.address, qrCodeDataURL);
        }

        console.log(
          `✅ QR code sent successfully to ${sanitizedPhone} via ${channel}`
        );
        return { success: true };
      } catch (messageError) {
        console.warn(
          `Failed to send ${channel} QR code image, sending text fallback:`,
          messageError
        );

        const fallbackMessage = `🔲 Your Wallet QR Code\n\nWallet Address:\n${wallet.address}\n\nTo generate a QR code:\n1. Visit any QR code generator\n2. Enter your wallet address\n3. Save the QR code for easy sharing\n\nNetwork: Mantle (Chain ID: 5000)`;

        try {
          if (!this.twilioClient) {
            throw new Error("Twilio client not available");
          }

          if (channel === "whatsapp") {
            await this.twilioClient.messages.create({
              body: fallbackMessage,
              from: `whatsapp:${env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:${sanitizedPhone}`,
            });
          } else {
            await this.twilioClient.messages.create({
              body: fallbackMessage,
              from: env.TWILIO_PHONE_NUMBER,
              to: sanitizedPhone,
            });
          }

          console.log(
            `✅ QR code fallback message sent to ${sanitizedPhone} via ${channel}`
          );
          return { success: true };
        } catch (fallbackError) {
          console.error(`Failed to send fallback message:`, fallbackError);
          return {
            success: false,
            message: "Failed to send QR code information",
          };
        }
      }
    } catch (error) {
      console.error("Error sending wallet QR code:", error);
      return {
        success: false,
        message: "Failed to send QR code",
      };
    }
  }

  async getDecryptedPrivateKey(phoneNumber: string): Promise<string | null> {
    try {
      const wallet = await this.getWallet(phoneNumber);
      if (!wallet) return null;

      return this.decryptPrivateKey(
        wallet.encryptedPrivateKey,
        wallet.iv,
        wallet.authTag
      );
    } catch (error) {
      console.error("Error decrypting private key:", error);
      return null;
    }
  }
}

export const walletService = new WalletService();
