import { ethers } from "ethers";
import * as crypto from "crypto";
import * as bip39 from "bip39";
import QRCode from "qrcode";
import twilio from "twilio";
import { env } from "../config/env";
import { DatabaseService } from "./database.service";
import { blockchainService } from "./blockchain.service";
import { Wallet, Transaction } from "../types";
import {
  addToken,
  toggleToken,
  getEnabledTokens,
  getTokenConfig,
  isTokenSupported,
  getSupportedTokenSymbols,
  TokenConfig,
} from "../config/tokens";

export class WalletService {
  public dbService: DatabaseService;
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
      const secretKey = Buffer.from(
        env.ENCRYPTION_SECRET_KEY.replace("0x", ""),
        "hex"
      );

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
      const secretKey = Buffer.from(
        env.ENCRYPTION_SECRET_KEY.replace("0x", ""),
        "hex"
      );
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
        chainId: env.MANTLE_CHAIN_ID,
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
        `Network: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\n` +
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
        body: `📱 QR Code for your Mantle wallet:\n\nAddress: ${walletAddress}\nNetwork: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\n\nScan to share your wallet address!`,
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

      // Send confirmation with automatic fallback (non-blocking for testing)
      try {
        await this.sendWalletCreationNotification(
          sanitizedPhone,
          wallet.address,
          qrCodeDataURL,
          channel
        );
      } catch (messageError) {
        console.warn(
          `Failed to send wallet creation notification, but wallet was created successfully:`,
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

        const fallbackMessage = `🔲 Your Wallet QR Code\n\nWallet Address:\n${wallet.address}\n\nTo generate a QR code:\n1. Visit any QR code generator\n2. Enter your wallet address\n3. Save the QR code for easy sharing\n\nNetwork: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})`;

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

  async getDecryptedPrivateKeyByAddress(address: string): Promise<string | null> {
    try {
      const wallet = await this.dbService.getWalletByAddress(address);
      if (!wallet) return null;

      return this.decryptPrivateKey(
        wallet.encryptedPrivateKey,
        wallet.iv,
        wallet.authTag
      );
    } catch (error) {
      console.error("Error decrypting private key by address:", error);
      return null;
    }
  }

  /**
   * Get wallet balances (MNT + USDC)
   */
  async getWalletBalances(phoneNumber: string): Promise<{
    success: boolean;
    balances?: Record<string, string> & { address: string };
    message?: string;
  }> {
    try {
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);
      const wallet = await this.dbService.getWallet(sanitizedPhone);

      if (!wallet) {
        return {
          success: false,
          message:
            "No wallet found for this phone number. Reply CREATE to create a wallet.",
        };
      }

      const balances = await blockchainService.getWalletBalances(
        wallet.address
      );

      return {
        success: true,
        balances,
      };
    } catch (error) {
      console.error("Error getting wallet balances:", error);
      return {
        success: false,
        message: "Failed to get wallet balances. Please try again later.",
      };
    }
  }

  /**
   * Transfer MNT tokens
   */
  async transferMNT(
    senderPhone: string,
    recipientAddress: string,
    amount: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    try {
      const sanitizedSenderPhone = this.sanitizePhoneNumber(senderPhone);

      // Get sender's wallet
      const senderWallet = await this.dbService.getWallet(sanitizedSenderPhone);
      if (!senderWallet) {
        return {
          success: false,
          message:
            "No wallet found for your phone number. Reply CREATE to create a wallet.",
        };
      }

      // Decrypt sender's private key
      const privateKey = this.decryptPrivateKey(
        senderWallet.encryptedPrivateKey,
        senderWallet.iv,
        senderWallet.authTag
      );

      // Validate recipient address
      if (!blockchainService.isValidAddress(recipientAddress)) {
        return {
          success: false,
          message: "Invalid recipient address. Please check and try again.",
        };
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          message: "Invalid amount. Please enter a positive number.",
        };
      }

      // Execute transfer
      const result = await blockchainService.transferMNT(
        privateKey,
        recipientAddress,
        amount,
        sanitizedSenderPhone,
        recipientPhone
      );

      return result;
    } catch (error) {
      console.error("Error transferring MNT:", error);
      return {
        success: false,
        message: "Failed to transfer MNT. Please try again later.",
      };
    }
  }

  /**
   * Transfer USDC tokens
   */
  async transferUSDC(
    senderPhone: string,
    recipientAddress: string,
    amount: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    try {
      const sanitizedSenderPhone = this.sanitizePhoneNumber(senderPhone);

      // Get sender's wallet
      const senderWallet = await this.dbService.getWallet(sanitizedSenderPhone);
      if (!senderWallet) {
        return {
          success: false,
          message:
            "No wallet found for your phone number. Reply CREATE to create a wallet.",
        };
      }

      // Decrypt sender's private key
      const privateKey = this.decryptPrivateKey(
        senderWallet.encryptedPrivateKey,
        senderWallet.iv,
        senderWallet.authTag
      );

      // Validate recipient address
      if (!blockchainService.isValidAddress(recipientAddress)) {
        return {
          success: false,
          message: "Invalid recipient address. Please check and try again.",
        };
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          message: "Invalid amount. Please enter a positive number.",
        };
      }

      // Execute transfer
      const result = await blockchainService.transferToken(
        env.USDC_ADDRESS,
        privateKey,
        recipientAddress,
        amount,
        sanitizedSenderPhone,
        recipientPhone
      );

      return result;
    } catch (error) {
      console.error("Error transferring USDC:", error);
      return {
        success: false,
        message: "Failed to transfer USDC. Please try again later.",
      };
    }
  }

  /**
   * Transfer any supported token using the new token system
   */
  async transferSupportedToken(
    senderPhone: string,
    recipientAddress: string,
    amount: string,
    tokenSymbol: string,
    recipientPhone?: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    try {
      const sanitizedSenderPhone = this.sanitizePhoneNumber(senderPhone);

      // Get sender's wallet
      const senderWallet = await this.dbService.getWallet(sanitizedSenderPhone);
      if (!senderWallet) {
        return {
          success: false,
          message:
            "No wallet found for your phone number. Reply CREATE to create a wallet.",
        };
      }

      // Decrypt sender's private key
      const privateKey = this.decryptPrivateKey(
        senderWallet.encryptedPrivateKey,
        senderWallet.iv,
        senderWallet.authTag
      );

      // Validate recipient address
      if (!blockchainService.isValidAddress(recipientAddress)) {
        return {
          success: false,
          message: "Invalid recipient address. Please check and try again.",
        };
      }

      // Validate amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return {
          success: false,
          message: "Invalid amount. Please enter a positive number.",
        };
      }

      // Use the new blockchain service method
      const result = await blockchainService.transferSupportedToken(
        tokenSymbol,
        privateKey,
        recipientAddress,
        amount,
        sanitizedSenderPhone,
        recipientPhone
      );

      return result;
    } catch (error) {
      console.error(`Error transferring ${tokenSymbol}:`, error);
      return {
        success: false,
        message: `Failed to transfer ${tokenSymbol}. Please try again later.`,
      };
    }
  }

  /**
   * Transfer tokens to another phone number with automatic wallet creation and notifications
   */
  async transferToPhone(
    senderPhone: string,
    recipientPhone: string,
    amount: string,
    tokenSymbol: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    message: string;
    transaction?: Transaction;
  }> {
    try {
      const sanitizedRecipientPhone = this.sanitizePhoneNumber(recipientPhone);
      let recipientWallet = await this.dbService.getWallet(
        sanitizedRecipientPhone
      );
      let walletCreated = false;

      // If recipient doesn't have a wallet, create one automatically
      if (!recipientWallet) {
        console.log(`📱 Creating new wallet for recipient ${recipientPhone}`);

        const walletCreationResult = await this.createWallet(
          sanitizedRecipientPhone,
          "whatsapp"
        );
        if (!walletCreationResult.success) {
          return {
            success: false,
            message: `Failed to create wallet for recipient ${recipientPhone}. Please try again later.`,
          };
        }

        // Get the newly created wallet
        recipientWallet = await this.dbService.getWallet(
          sanitizedRecipientPhone
        );
        if (!recipientWallet) {
          return {
            success: false,
            message:
              "Failed to retrieve newly created wallet. Please try again later.",
          };
        }

        walletCreated = true;
        console.log(
          `✅ New wallet created for ${recipientPhone}: ${recipientWallet.address}`
        );
      }

      // Perform the transfer
      const transferResult = await this.transferSupportedToken(
        senderPhone,
        recipientWallet.address,
        amount,
        tokenSymbol,
        sanitizedRecipientPhone
      );

      // Send notifications if transfer was successful
      if (transferResult.success && transferResult.txHash) {
        await this.sendTransferNotifications(
          senderPhone,
          sanitizedRecipientPhone,
          amount,
          tokenSymbol,
          transferResult.txHash,
          recipientWallet.address,
          walletCreated
        );
      }

      return transferResult;
    } catch (error) {
      console.error("Error transferring to phone:", error);
      return {
        success: false,
        message: "Failed to transfer tokens. Please try again later.",
      };
    }
  }

  /**
   * Add a new token to the system
   */
  async addNewToken(
    symbol: string,
    name: string,
    address: string,
    decimals: number = 18,
    enabled: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate the token address
      if (!blockchainService.isValidAddress(address)) {
        return {
          success: false,
          message: "Invalid token contract address",
        };
      }

      // Add the token
      addToken(symbol, name, address, decimals, enabled);

      return {
        success: true,
        message: `Token ${symbol.toUpperCase()} (${name}) added successfully`,
      };
    } catch (error) {
      console.error("Error adding token:", error);
      return {
        success: false,
        message: "Failed to add token",
      };
    }
  }

  /**
   * Enable or disable a token
   */
  async toggleTokenStatus(
    symbol: string,
    enabled: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      toggleToken(symbol, enabled);

      return {
        success: true,
        message: `Token ${symbol.toUpperCase()} ${
          enabled ? "enabled" : "disabled"
        } successfully`,
      };
    } catch (error) {
      console.error("Error toggling token:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to toggle token",
      };
    }
  }

  /**
   * Get list of supported tokens
   */
  getSupportedTokens(): {
    success: boolean;
    tokens: Record<string, TokenConfig>;
  } {
    try {
      const tokens = getEnabledTokens();
      return {
        success: true,
        tokens,
      };
    } catch (error) {
      console.error("Error getting supported tokens:", error);
      return {
        success: false,
        tokens: {},
      };
    }
  }

  /**
   * Send transfer notifications to both sender and recipient with SMS fallback
   */
  async sendTransferNotifications(
    senderPhone: string,
    recipientPhone: string,
    amount: string,
    tokenSymbol: string,
    txHash: string,
    recipientAddress: string,
    walletCreated: boolean
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn(
          "Twilio client not available, skipping transfer notifications"
        );
        return;
      }

      const tokenEmoji =
        tokenSymbol === "MNT" ? "💎" : tokenSymbol === "USDC" ? "💵" : "🪙";
      const explorerUrl = `https://mantlescan.xyz/tx/${txHash}`;

      // Send notification to recipient
      const recipientMessage = walletCreated
        ? `🎉 Welcome to Zest Wallet!\n\n` +
          `You've received ${amount} ${tokenSymbol} ${tokenEmoji}\n\n` +
          `📱 Your new wallet address:\n${recipientAddress}\n\n` +
          `🔗 Transaction: ${explorerUrl}\n\n` +
          `Reply BALANCE to check your wallet balance.\n` +
          `Reply HELP for more commands.`
        : `💰 You've received ${amount} ${tokenSymbol} ${tokenEmoji}\n\n` +
          `📱 Wallet: ${recipientAddress}\n\n` +
          `🔗 Transaction: ${explorerUrl}\n\n` +
          `Reply BALANCE to check your updated balance.`;

      // Send notification to sender
      const senderMessage = walletCreated
        ? `✅ Transfer completed!\n\n` +
          `Sent: ${amount} ${tokenSymbol} ${tokenEmoji}\n` +
          `To: ${recipientPhone}\n\n` +
          `📱 A new wallet was created for the recipient:\n${recipientAddress}\n\n` +
          `🔗 Transaction: ${explorerUrl}`
        : `✅ Transfer completed!\n\n` +
          `Sent: ${amount} ${tokenSymbol} ${tokenEmoji}\n` +
          `To: ${recipientPhone}\n\n` +
          `🔗 Transaction: ${explorerUrl}`;

      // Send notifications with WhatsApp first, SMS fallback
      await Promise.all([
        this.sendNotificationWithFallback(recipientPhone, recipientMessage),
        this.sendNotificationWithFallback(senderPhone, senderMessage),
      ]);

      console.log(
        `✅ Transfer notifications sent to ${senderPhone} and ${recipientPhone}`
      );
    } catch (error) {
      console.error("Error in sendTransferNotifications:", error);
      // Don't throw error as the transfer itself was successful
    }
  }

  /**
   * Send wallet creation notification with automatic fallback
   */
  private async sendWalletCreationNotification(
    phoneNumber: string,
    walletAddress: string,
    qrCodeDataURL: string,
    preferredChannel: string = "whatsapp"
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn(
          "Twilio client not available, skipping wallet creation notification"
        );
        return;
      }

      // Try preferred channel first (WhatsApp by default)
      if (preferredChannel === "whatsapp") {
        try {
          await this.sendWhatsAppMessage(
            phoneNumber,
            walletAddress,
            qrCodeDataURL
          );
          console.log(`📱 WhatsApp wallet notification sent to ${phoneNumber}`);
          return;
        } catch (whatsappError: any) {
          console.log(
            `WhatsApp failed for ${phoneNumber}, trying SMS fallback:`,
            whatsappError.message
          );

          // Fallback to SMS
          try {
            await this.sendSMSMessage(
              phoneNumber,
              walletAddress,
              qrCodeDataURL
            );
            console.log(`📧 SMS wallet notification sent to ${phoneNumber}`);
          } catch (smsError: any) {
            console.error(
              `Both WhatsApp and SMS failed for ${phoneNumber}:`,
              smsError.message
            );
            throw smsError;
          }
        }
      } else {
        // SMS was specifically requested
        await this.sendSMSMessage(phoneNumber, walletAddress, qrCodeDataURL);
        console.log(`📧 SMS wallet notification sent to ${phoneNumber}`);
      }
    } catch (error) {
      console.error(
        `Error sending wallet creation notification to ${phoneNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Send notification with WhatsApp first, SMS fallback
   */
  private async sendNotificationWithFallback(
    phoneNumber: string,
    message: string
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping notification");
        return;
      }

      // Try WhatsApp first
      try {
        await this.twilioClient.messages.create({
          from: env.TWILIO_WHATSAPP_NUMBER,
          to: `whatsapp:${phoneNumber}`,
          body: message,
        });
        console.log(`📱 WhatsApp notification sent to ${phoneNumber}`);
      } catch (whatsappError: any) {
        console.log(
          `WhatsApp failed for ${phoneNumber}, trying SMS fallback:`,
          whatsappError.message
        );

        // Fallback to SMS
        try {
          await this.twilioClient.messages.create({
            from: env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
            body: message,
          });
          console.log(`📧 SMS notification sent to ${phoneNumber}`);
        } catch (smsError: any) {
          console.error(
            `Both WhatsApp and SMS failed for ${phoneNumber}:`,
            smsError.message
          );
          // Don't throw error as the transfer itself was successful
        }
      }
    } catch (error) {
      console.error(`Error sending notification to ${phoneNumber}:`, error);
      // Don't throw error as the transfer itself was successful
    }
  }

  /**
   * Send balance information via SMS/WhatsApp with automatic fallback
   */
  async sendBalanceMessage(
    phoneNumber: string,
    channel: "whatsapp" | "sms"
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const balanceResult = await this.getWalletBalances(phoneNumber);

      if (!balanceResult.success || !balanceResult.balances) {
        return {
          success: false,
          message: balanceResult.message,
        };
      }

      const balances = balanceResult.balances;
      const sanitizedPhone = this.sanitizePhoneNumber(phoneNumber);

      // Build dynamic balance message
      let balanceLines = "";
      const supportedTokens = getSupportedTokenSymbols();

      for (const symbol of supportedTokens) {
        const tokenConfig = getTokenConfig(symbol);
        if (!tokenConfig) continue;

        const balance = (balances as any)[symbol.toLowerCase()] || "0";
        const formattedBalance = parseFloat(balance).toFixed(
          tokenConfig.decimals === 6 ? 2 : 4
        );

        // Add appropriate emoji for each token
        const emoji = symbol === "MNT" ? "💎" : symbol === "USDC" ? "💵" : "🪙";
        balanceLines += `${emoji} ${symbol}: ${formattedBalance} ${symbol}\n`;
      }

      const message =
        `💰 Your Wallet Balance\n\n` +
        `Address: ${balances.address}\n\n` +
        balanceLines +
        `\nNetwork: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\n\n` +
        `Supported tokens: ${supportedTokens.join(", ")}\n\n` +
        `Reply SEND to transfer tokens.`;

      if (!this.twilioClient) {
        console.warn("Twilio client not available, skipping balance message");
        return { success: true };
      }

      try {
        if (channel === "whatsapp") {
          // Try WhatsApp first, fallback to SMS
          try {
            await this.twilioClient.messages.create({
              from: env.TWILIO_WHATSAPP_NUMBER,
              to: `whatsapp:${sanitizedPhone}`,
              body: message,
            });
            console.log(
              `✅ Balance message sent to ${sanitizedPhone} via WhatsApp`
            );
          } catch (whatsappError: any) {
            console.log(
              `WhatsApp failed for ${sanitizedPhone}, trying SMS fallback:`,
              whatsappError.message
            );

            // Fallback to SMS
            await this.twilioClient.messages.create({
              from: env.TWILIO_PHONE_NUMBER,
              to: sanitizedPhone,
              body: message,
            });
            console.log(
              `✅ Balance message sent to ${sanitizedPhone} via SMS (fallback)`
            );
          }
        } else {
          // SMS was specifically requested
          await this.twilioClient.messages.create({
            from: env.TWILIO_PHONE_NUMBER,
            to: sanitizedPhone,
            body: message,
          });
          console.log(`✅ Balance message sent to ${sanitizedPhone} via SMS`);
        }

        return { success: true };
      } catch (messageError) {
        console.error(`Failed to send balance message:`, messageError);
        return {
          success: false,
          message: "Failed to send balance information",
        };
      }
    } catch (error) {
      console.error("Error sending balance message:", error);
      return {
        success: false,
        message: "Failed to get balance information",
      };
    }
  }
}

export const walletService = new WalletService();
