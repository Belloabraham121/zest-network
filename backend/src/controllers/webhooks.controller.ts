import { Request, Response } from "express";
import { walletService } from "../services/wallet.service";
import { rateLimiterService } from "../services/rate-limiter.service";
import { WhatsappPayload } from "../types";
import { env } from "../config/env";
import { getSupportedTokenSymbols, isTokenSupported } from "../config/tokens";

export class WebhooksController {
  private sanitizeInput(input: string): string {
    if (!input || typeof input !== "string") {
      throw new Error("Invalid input");
    }

    // Remove potentially dangerous characters and normalize
    return input
      .trim()
      .replace(/[<>"'&]/g, "") // Remove HTML/script injection chars
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
      .toUpperCase(); // Normalize to uppercase for command matching
  }

  private extractPhoneNumber(twilioPhone: string): string {
    if (!twilioPhone) {
      throw new Error("Phone number is required");
    }

    // Handle WhatsApp format: "whatsapp:+1234567890"
    if (twilioPhone.startsWith("whatsapp:")) {
      const phoneNumber = twilioPhone.replace("whatsapp:", "").trim();
      // Ensure phone number starts with + if it doesn't already
      return phoneNumber.startsWith("+") ? phoneNumber : "+" + phoneNumber;
    }

    // Handle regular SMS format: "+1234567890"
    const phoneNumber = twilioPhone.trim();
    return phoneNumber.startsWith("+") ? phoneNumber : "+" + phoneNumber;
  }

  private parseCommand(message: string): { command: string; args: string[] } {
    const sanitized = this.sanitizeInput(message);
    const parts = sanitized.split(/\s+/).filter((part) => part.length > 0);

    const command = parts[0] || "";
    let args = parts.slice(1);

    // Handle "SEND" command with "TO" keyword
    if (command === "SEND" || command === "TRANSFER") {
      // Remove "TO" keyword if present to normalize the command format
      args = args.filter(arg => arg !== "TO");
    }

    return {
      command,
      args,
    };
  }

  async handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log("WhatsApp webhook received:", req.body);
      console.log("[DEBUG] Request headers:", req.headers);
      console.log("[DEBUG] Full request body:", req.body);

      const { Body, From, To } = req.body as WhatsappPayload;

      if (!Body || !From) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const phoneNumber = this.extractPhoneNumber(From);
      const { command, args } = this.parseCommand(Body);

      console.log(`WhatsApp command from ${phoneNumber}: ${command}`, 'args:', args);
      
      // Check rate limits before processing
      const rateLimitCheck = await rateLimiterService.canSendMessage(phoneNumber);
      if (!rateLimitCheck.allowed) {
        console.warn(`🚫 Rate limit exceeded for ${phoneNumber}: ${rateLimitCheck.reason}`);
        const rateLimitTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>⚠️ Daily message limit reached. Please try again tomorrow or upgrade your account for higher limits.</Message>
        </Response>`;
        
        res.set("Content-Type", "text/xml");
        res.status(200).send(rateLimitTwiml);
        return;
      }

      let response: { success: boolean; message: string };

      switch (command) {
        case "CREATE":
        case "WALLET":
        case "START":
          response = await walletService.createWallet(phoneNumber, "whatsapp");
          break;

        case "BALANCE":
        case "BAL":
          response = await this.handleBalanceCommand(phoneNumber);
          break;

        case "ADDRESS":
        case "ADDR":
          response = await this.handleAddressCommand(phoneNumber);
          break;

        case "QR":
        case "QRCODE":
          response = await this.handleQRCommand(phoneNumber, "whatsapp");
          break;

        case "SEND":
        case "TRANSFER":
          response = await this.handleSendCommand(phoneNumber, args);
          break;

        case "HELP":
        case "COMMANDS":
          response = this.handleHelpCommand();
          break;

        case "ADDTOKEN":
          response = await this.handleAddTokenCommand(args);
          break;

        case "TOGGLETOKEN":
          response = await this.handleToggleTokenCommand(args);
          break;

        case "TOKENS":
          response = this.handleTokensCommand();
          break;

        case "DELETE":
        case "RESET":
          response = await this.handleDeleteCommand(phoneNumber);
          break;

        default:
          response = {
            success: false,
            message:
              "Unknown command. Reply HELP to see available commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, QR, SEND, HELP",
          };
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response.message}</Message>
      </Response>`;

      console.log(`[WhatsApp Response] To: ${phoneNumber}, Command: ${command}, Success: ${response.success}`);
      console.log(`[WhatsApp TwiML] ${twiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);
      
      // Record the message in rate limiter
      await rateLimiterService.recordMessage(phoneNumber);
      
      const rateLimitStatus = await rateLimiterService.getRateLimitStatus(phoneNumber);
      console.log(`[WhatsApp] Response sent successfully to ${phoneNumber}`);
      console.log(`📊 Rate Limit Status: ${rateLimitStatus.remaining}/${rateLimitStatus.dailyLimit} messages remaining`);
      
      if (rateLimitStatus.remaining <= 2) {
        console.warn(`⚠️  WARNING: Only ${rateLimitStatus.remaining} messages remaining for ${phoneNumber}`);
      }
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      
      // Check if it's a Twilio rate limit error (429)
      const err = error as any;
      if (err.status === 429 || err.code === 63038) {
        console.error('🚨 TWILIO RATE LIMIT EXCEEDED:', {
          errorCode: err.code,
          message: err.message,
          timestamp: new Date().toISOString()
        });
      }

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Sorry, there was an error processing your request. Please try again later.</Message>
      </Response>`;

      console.log(`[WhatsApp Error] ${error}`);
      console.log(`[WhatsApp Error TwiML] ${errorTwiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(errorTwiml);
    }
  }

  async handleSMSWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log("SMS webhook received:", req.body);

      const { Body, From, To } = req.body;

      if (!Body || !From) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const phoneNumber = this.extractPhoneNumber(From);
      const { command, args } = this.parseCommand(Body);

      console.log(`SMS command from ${phoneNumber}: ${command}`);
      
      // Check rate limits before processing
      const rateLimitCheck = await rateLimiterService.canSendMessage(phoneNumber);
      if (!rateLimitCheck.allowed) {
        console.warn(`🚫 Rate limit exceeded for ${phoneNumber}: ${rateLimitCheck.reason}`);
        const rateLimitTwiml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>⚠️ Daily message limit reached. Please try again tomorrow or upgrade your account for higher limits.</Message>
        </Response>`;
        
        res.set("Content-Type", "text/xml");
        res.status(200).send(rateLimitTwiml);
        return;
      }

      let response: { success: boolean; message: string };

      switch (command) {
        case "CREATE":
        case "WALLET":
        case "START":
          response = await walletService.createWallet(phoneNumber, "sms");
          break;

        case "BALANCE":
        case "BAL":
          response = await this.handleBalanceCommand(phoneNumber);
          break;

        case "ADDRESS":
        case "ADDR":
          response = await this.handleAddressCommand(phoneNumber);
          break;

        case "QR":
        case "QRCODE":
          response = await this.handleQRCommand(phoneNumber, "sms");
          break;

        case "SEND":
        case "TRANSFER":
          response = await this.handleSendCommand(phoneNumber, args);
          break;

        case "HELP":
        case "COMMANDS":
          response = this.handleHelpCommand();
          break;

        default:
          response = {
            success: false,
            message:
              "Unknown command. Reply HELP for commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, QR, SEND, HELP",
          };
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response.message}</Message>
      </Response>`;

      console.log(`[SMS Response] To: ${phoneNumber}, Command: ${command}, Success: ${response.success}`);
      console.log(`[SMS TwiML] ${twiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);
      
      // Record the message in rate limiter
      await rateLimiterService.recordMessage(phoneNumber);
      
      const rateLimitStatus = await rateLimiterService.getRateLimitStatus(phoneNumber);
      console.log(`[SMS] Response sent successfully to ${phoneNumber}`);
      console.log(`📊 Rate Limit Status: ${rateLimitStatus.remaining}/${rateLimitStatus.dailyLimit} messages remaining`);
      
      if (rateLimitStatus.remaining <= 2) {
        console.warn(`⚠️  WARNING: Only ${rateLimitStatus.remaining} messages remaining for ${phoneNumber}`);
      }
    } catch (error) {
      console.error("SMS webhook error:", error);
      
      // Check if it's a Twilio rate limit error
      const err = error as any;
      if (err.status === 429 || err.code === 63038) {
        console.error('🚨 TWILIO RATE LIMIT EXCEEDED:', {
          errorCode: err.code,
          message: err.message,
          timestamp: new Date().toISOString()
        });
      }

      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Sorry, there was an error. Please try again later.</Message>
      </Response>`;

      console.log(`[SMS Error] ${error}`);
      console.log(`[SMS Error TwiML] ${errorTwiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(errorTwiml);
    }
  }

  private async handleBalanceCommand(
    phoneNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const balanceResult = await walletService.getWalletBalances(phoneNumber);

      if (!balanceResult.success || !balanceResult.balances) {
        return {
          success: false,
          message: balanceResult.message || "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      const { mnt, usdc, address } = balanceResult.balances;

      return {
        success: true,
        message: 
          `💰 Your Wallet Balance\n\n` +
          `Address: ${address}\n\n` +
          `💎 MNT: ${parseFloat(mnt).toFixed(4)} MNT\n` +
          `💵 USDC: ${parseFloat(usdc).toFixed(2)} USDC\n\n` +
          `Network: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\n\n` +
          `Reply SEND to transfer tokens.`,
      };
    } catch (error) {
      console.error("Error handling balance command:", error);
      return {
        success: false,
        message: "Error checking balance. Please try again.",
      };
    }
  }

  private async handleAddressCommand(
    phoneNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const wallet = await walletService.getWallet(phoneNumber);

      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      return {
        success: true,
        message: `Your Mantle wallet address:\n${wallet.address}\n\nNetwork: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\nSave this address safely!`,
      };
    } catch (error) {
      console.error("Error handling address command:", error);
      return {
        success: false,
        message: "Error retrieving address. Please try again.",
      };
    }
  }

  private async handleQRCommand(
    phoneNumber: string,
    channel: "whatsapp" | "sms"
  ): Promise<{ success: boolean; message: string }> {
    try {
      const wallet = await walletService.getWallet(phoneNumber);

      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      const qrResult = await walletService.sendWalletQR(phoneNumber, channel);

      if (!qrResult.success) {
        return {
          success: false,
          message: "Error generating QR code. Please try again.",
        };
      }

      return {
        success: true,
        message: `QR Code sent for your wallet!\n\nAddress: ${wallet.address}\n\nNetwork: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})\n\nCheck your messages for the QR code image.`,
      };
    } catch (error) {
      console.error("Error handling QR command:", error);
      return {
        success: false,
        message: "Error generating QR code. Please try again.",
      };
    }
  }

  private async handleSendCommand(
    phoneNumber: string,
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[DEBUG] handleSendCommand called with phoneNumber: ${phoneNumber}, args:`, args);
      if (args.length < 3) {
        return {
          success: false,
          message:
            "Invalid SEND format. Use:\n\n" +
            "SEND <amount> <token> <recipient>\n\n" +
            "Examples:\n" +
            `SEND 10 ${getSupportedTokenSymbols()[0]} +1234567890\n` +
            `SEND 1 ${getSupportedTokenSymbols()[0]} +2348123456789\n` +
            `SEND 0.5 ${getSupportedTokenSymbols()[0]} 0x123...\n\n` +
            `Tokens: ${getSupportedTokenSymbols().join(", ")}\n` +
            "Recipients: phone numbers (+...) or wallet addresses (0x...)",
        };
      }

      const [amountStr, token, recipient] = args;
      const amount = amountStr.replace(/,/g, ""); // Remove commas
      const tokenUpper = token.toUpperCase();

      // Validate token using the new token system
      if (!isTokenSupported(tokenUpper)) {
        const supportedTokens = getSupportedTokenSymbols().join(", ");
        return {
          success: false,
          message: `Token ${tokenUpper} is not supported. Supported tokens: ${supportedTokens}`,
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

      let result;

      // Check if recipient is a phone number or address
      if (recipient.startsWith("+")) {
        // Transfer to phone number
        result = await walletService.transferToPhone(
          phoneNumber,
          recipient,
          amount,
          tokenUpper
        );
      } else if (recipient.startsWith("0x")) {
        // Transfer to address
        result = await walletService.transferSupportedToken(
          phoneNumber,
          recipient,
          amount,
          tokenUpper
        );
      } else if (/^\d+$/.test(recipient)) {
        // Handle phone number without + prefix (add + prefix)
        const formattedRecipient = "+" + recipient;
        result = await walletService.transferToPhone(
          phoneNumber,
          formattedRecipient,
          amount,
          tokenUpper
        );
      } else {
        return {
          success: false,
          message:
            "Invalid recipient. Use:\n" +
            "• Phone number: +1234567890\n" +
            "• Wallet address: 0x123...",
        };
      }

      if (result.success && result.txHash) {
        return {
          success: true,
          message:
            `✅ Transfer Successful!\n\n` +
            `Amount: ${amount} ${tokenUpper}\n` +
            `To: ${recipient}\n` +
            `Transaction: ${result.txHash}\n\n` +
            `Gas fees paid by Zest Network 🚀`,
        };
      } else {
        return {
          success: false,
          message: result.message,
        };
      }
    } catch (error) {
      console.error("Error handling send command:", error);
      return {
        success: false,
        message: "Error processing transfer. Please try again later.",
      };
    }
  }

  private async handleDeleteCommand(
    phoneNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const sanitizedPhone = phoneNumber.replace(/[^+\d]/g, "");
      const deleted = await walletService.dbService.deleteWallet(sanitizedPhone);
      
      if (deleted) {
        return {
          success: true,
          message: "Wallet deleted successfully. You can now create a new wallet with CREATE."
        };
      } else {
        return {
          success: false,
          message: "No wallet found to delete."
        };
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      return {
        success: false,
        message: "Error deleting wallet. Please try again."
      };
    }
  }

  private handleHelpCommand(): { success: boolean; message: string } {
    const supportedTokens = getSupportedTokenSymbols();
    const primaryToken = supportedTokens[0] || "MNT";
    
    const helpMessage =
      `🔹 Zest Wallet Commands:\n\n` +
      `CREATE - Create a new wallet\n` +
      `BALANCE - Check wallet balance\n` +
      `ADDRESS - Get wallet address\n` +
      `QR - Generate QR code for wallet\n` +
      `SEND - Transfer tokens\n` +
      `TOKENS - List supported tokens\n` +
      `HELP - Show this help\n\n` +
      `💸 Transfer Examples:\n` +
      `SEND 10 ${primaryToken} +1234567890\n` +
      `SEND 0.5 ${primaryToken} 0x123...\n\n` +
      `📋 Supported Tokens: ${supportedTokens.join(", ")}\n\n` +
      `Gas fees paid by Zest! 🚀\n` +
      `Network: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})`;

    return {
      success: true,
      message: helpMessage,
    };
  }

  private async handleAddTokenCommand(
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (args.length < 3) {
        return {
          success: false,
          message:
            "Invalid ADDTOKEN format. Use:\n\n" +
            "ADDTOKEN <symbol> <name> <address> [decimals]\n\n" +
            "Example:\n" +
            "ADDTOKEN USDT \"Tether USD\" 0x123... 6",
        };
      }

      const [symbol, name, address, decimalsStr] = args;
      const decimals = decimalsStr ? parseInt(decimalsStr) : 18;

      if (isNaN(decimals) || decimals < 0 || decimals > 18) {
        return {
          success: false,
          message: "Invalid decimals. Must be a number between 0 and 18.",
        };
      }

      const result = await walletService.addNewToken(
        symbol,
        name,
        address,
        decimals
      );

      return result;
    } catch (error) {
      console.error("Error handling add token command:", error);
      return {
        success: false,
        message: "Error adding token. Please try again.",
      };
    }
  }

  private async handleToggleTokenCommand(
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (args.length < 2) {
        return {
          success: false,
          message:
            "Invalid TOGGLETOKEN format. Use:\n\n" +
            "TOGGLETOKEN <symbol> <enable|disable>\n\n" +
            "Examples:\n" +
            "TOGGLETOKEN USDT enable\n" +
            "TOGGLETOKEN USDT disable",
        };
      }

      const [symbol, action] = args;
      const enabled = action.toLowerCase() === "enable";

      if (action.toLowerCase() !== "enable" && action.toLowerCase() !== "disable") {
        return {
          success: false,
          message: "Action must be either 'enable' or 'disable'.",
        };
      }

      const result = await walletService.toggleTokenStatus(symbol, enabled);
      return result;
    } catch (error) {
      console.error("Error handling toggle token command:", error);
      return {
        success: false,
        message: "Error toggling token. Please try again.",
      };
    }
  }

  private handleTokensCommand(): { success: boolean; message: string } {
    try {
      const { success, tokens } = walletService.getSupportedTokens();
      
      if (!success || Object.keys(tokens).length === 0) {
        return {
          success: false,
          message: "No supported tokens found.",
        };
      }

      let message = "🪙 Supported Tokens:\n\n";
      
      for (const [symbol, config] of Object.entries(tokens)) {
        const status = config.enabled ? "✅" : "❌";
        const type = config.isNative ? "(Native)" : "(ERC-20)";
        message += `${status} ${symbol} - ${config.name} ${type}\n`;
        if (!config.isNative) {
          message += `   Address: ${config.address}\n`;
        }
        message += `   Decimals: ${config.decimals}\n\n`;
      }

      message += `Network: Mantle (Chain ID: ${env.MANTLE_CHAIN_ID})`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error("Error handling tokens command:", error);
      return {
        success: false,
        message: "Error retrieving token information.",
      };
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: "healthy",
      service: "zest-wallet-webhooks",
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const webhooksController = new WebhooksController();
