import { Request, Response } from "express";
import { walletService } from "../services/wallet.service";
import { rateLimiterService } from "../services/rate-limiter.service";
import { lifiQuoteManager } from "../services/lifi-quote-manager.service";
import { lifiCrossChainExecutor } from "../services/lifi-cross-chain-executor.service";
import { lifiChainManager } from "../services/lifi-chain-manager.service";
import { lifiService } from "../services/lifi.service";
import { lifiTokenManager } from "../services/lifi-token-manager.service";
import { LiFiExecutionEngineService } from "../services/lifi-execution-engine.service";
import { TransactionHistoryService } from "../services/transaction-history.service";
import { lifiMonitoring } from "../services/lifi-monitoring.service";
import { twilioService } from "../services/twilio.service";
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
      args = args.filter((arg) => arg !== "TO");
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

      console.log(
        `WhatsApp command from ${phoneNumber}: ${command}`,
        "args:",
        args
      );

      // Check rate limits before processing
      const rateLimitCheck = await rateLimiterService.canSendMessage(
        phoneNumber
      );
      if (!rateLimitCheck.allowed) {
        console.warn(
          `🚫 Rate limit exceeded for ${phoneNumber}: ${rateLimitCheck.reason}`
        );
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

        case "BRIDGE":
        case "CROSSCHAIN":
          response = await this.handleBridgeCommand(phoneNumber, args);
          break;

        case "SWAP":
          response = await this.handleSwapCommand(
            phoneNumber,
            args,
            "whatsapp"
          );
          break;

        case "QUOTE":
          response = await this.handleQuoteCommand(phoneNumber, args);
          break;

        case "CHAINS":
          response = await this.handleChainsCommand();
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

        case "HISTORY":
        case "TRANSACTIONS":
          response = await this.handleHistoryCommand(phoneNumber, args);
          break;

        case "STATS":
        case "STATISTICS":
          response = await this.handleStatsCommand(phoneNumber);
          break;

        case "MONITOR":
        case "PERFORMANCE":
          response = this.handleMonitorCommand();
          break;

        default:
          response = {
            success: false,
            message:
              "Unknown command. Reply HELP to see available commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, QR, SEND, BRIDGE, SWAP, QUOTE, CHAINS, HISTORY, STATS, MONITOR, HELP",
          };
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response.message}</Message>
      </Response>`;

      console.log(
        `[WhatsApp Response] To: ${phoneNumber}, Command: ${command}, Success: ${response.success}`
      );
      console.log(`[WhatsApp TwiML] ${twiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);

      // Record the message in rate limiter
      await rateLimiterService.recordMessage(phoneNumber);

      const rateLimitStatus = await rateLimiterService.getRateLimitStatus(
        phoneNumber
      );
      console.log(`[WhatsApp] Response sent successfully to ${phoneNumber}`);
      console.log(
        `📊 Rate Limit Status: ${rateLimitStatus.remaining}/${rateLimitStatus.dailyLimit} messages remaining`
      );

      if (rateLimitStatus.remaining <= 2) {
        console.warn(
          `⚠️  WARNING: Only ${rateLimitStatus.remaining} messages remaining for ${phoneNumber}`
        );
      }
    } catch (error) {
      console.error("WhatsApp webhook error:", error);

      // Check if it's a Twilio rate limit error (429)
      const err = error as any;
      if (err.status === 429 || err.code === 63038) {
        console.error("🚨 TWILIO RATE LIMIT EXCEEDED:", {
          errorCode: err.code,
          message: err.message,
          timestamp: new Date().toISOString(),
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
      const rateLimitCheck = await rateLimiterService.canSendMessage(
        phoneNumber
      );
      if (!rateLimitCheck.allowed) {
        console.warn(
          `🚫 Rate limit exceeded for ${phoneNumber}: ${rateLimitCheck.reason}`
        );
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

        case "BRIDGE":
        case "CROSSCHAIN":
          response = await this.handleBridgeCommand(phoneNumber, args);
          break;

        case "SWAP":
          response = await this.handleSwapCommand(phoneNumber, args, "sms");
          break;

        case "QUOTE":
          response = await this.handleQuoteCommand(phoneNumber, args);
          break;

        case "CHAINS":
          response = await this.handleChainsCommand();
          break;

        case "HELP":
        case "COMMANDS":
          response = this.handleHelpCommand();
          break;

        case "HISTORY":
        case "TRANSACTIONS":
          response = await this.handleHistoryCommand(phoneNumber, args);
          break;

        case "STATS":
        case "STATISTICS":
          response = await this.handleStatsCommand(phoneNumber);
          break;

        default:
          response = {
            success: false,
            message:
              "Unknown command. Reply HELP for commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, QR, SEND, BRIDGE, SWAP, QUOTE, CHAINS, HISTORY, STATS, MONITOR, HELP",
          };
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${response.message}</Message>
      </Response>`;

      console.log(
        `[SMS Response] To: ${phoneNumber}, Command: ${command}, Success: ${response.success}`
      );
      console.log(`[SMS TwiML] ${twiml}`);

      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);

      // Record the message in rate limiter
      await rateLimiterService.recordMessage(phoneNumber);

      const rateLimitStatus = await rateLimiterService.getRateLimitStatus(
        phoneNumber
      );
      console.log(`[SMS] Response sent successfully to ${phoneNumber}`);
      console.log(
        `📊 Rate Limit Status: ${rateLimitStatus.remaining}/${rateLimitStatus.dailyLimit} messages remaining`
      );

      if (rateLimitStatus.remaining <= 2) {
        console.warn(
          `⚠️  WARNING: Only ${rateLimitStatus.remaining} messages remaining for ${phoneNumber}`
        );
      }
    } catch (error) {
      console.error("SMS webhook error:", error);

      // Check if it's a Twilio rate limit error
      const err = error as any;
      if (err.status === 429 || err.code === 63038) {
        console.error("🚨 TWILIO RATE LIMIT EXCEEDED:", {
          errorCode: err.code,
          message: err.message,
          timestamp: new Date().toISOString(),
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
          message:
            balanceResult.message ||
            "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      const { address, ...balances } = balanceResult.balances;

      // Get MNT and USDC balances with proper fallbacks
      const mntBalance = balances.mnt || balances.MNT || "0";
      const usdcBalance = balances.usdc || balances.USDC || "0";

      return {
        success: true,
        message:
          `💰 Your Wallet Balance\n\n` +
          `Address: ${address}\n\n` +
          `💎 MNT: ${parseFloat(mntBalance).toFixed(4)} MNT\n` +
          `💵 USDC: ${parseFloat(usdcBalance).toFixed(2)} USDC\n\n` +
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
      console.log(
        `[DEBUG] handleSendCommand called with phoneNumber: ${phoneNumber}, args:`,
        args
      );
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
      const deleted = await walletService.dbService.deleteWallet(
        sanitizedPhone
      );

      if (deleted) {
        return {
          success: true,
          message:
            "Wallet deleted successfully. You can now create a new wallet with CREATE.",
        };
      } else {
        return {
          success: false,
          message: "No wallet found to delete.",
        };
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      return {
        success: false,
        message: "Error deleting wallet. Please try again.",
      };
    }
  }

  private handleHelpCommand(): { success: boolean; message: string } {
    const supportedTokens = getSupportedTokenSymbols();
    const primaryToken = supportedTokens[0] || "MNT";

    const helpMessage =
      `🔹 Zest Wallet Commands:\n\n` +
      `📱 Basic Commands:\n` +
      `CREATE - Create a new wallet\n` +
      `BALANCE - Check wallet balance\n` +
      `ADDRESS - Get wallet address\n` +
      `QR - Generate QR code for wallet\n` +
      `SEND - Transfer tokens\n` +
      `TOKENS - List supported tokens\n` +
      `HELP - Show this help\n\n` +
      `🌉 Cross-Chain Commands:\n` +
      `BRIDGE - Bridge tokens between chains\n` +
      `SWAP - Swap tokens on same chain\n` +
      `QUOTE - Get price quotes\n` +
      `CHAINS - List supported chains\n\n` +
      `📋 Transaction History:\n` +
      `HISTORY - View recent transactions\n` +
      `HISTORY 20 - View more transactions\n` +
      `STATS - View transaction statistics\n\n` +
      `📊 System Monitoring:\n` +
      `MONITOR - View LI.FI performance stats\n\n` +
      `💸 Transfer Examples:\n` +
      `SEND 10 ${primaryToken} +1234567890\n` +
      `SEND 0.5 ${primaryToken} 0x123...\n\n` +
      `🌉 Cross-Chain Examples:\n` +
      `BRIDGE 10 USDC ethereum polygon 0x123...\n` +
      `SWAP 100 USDC ETH\n` +
      `QUOTE 0.5 ETH USDC ethereum arbitrum\n\n` +
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
            'ADDTOKEN USDT "Tether USD" 0x123... 6',
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

      if (
        action.toLowerCase() !== "enable" &&
        action.toLowerCase() !== "disable"
      ) {
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

  private async handleBridgeCommand(
    phoneNumber: string,
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (args.length < 5) {
        return {
          success: false,
          message:
            "Invalid BRIDGE format. Use:\n\n" +
            "BRIDGE <amount> <token> <fromChain> <toChain> <toAddress>\n\n" +
            "Examples:\n" +
            "BRIDGE 10 USDC ethereum polygon 0x123...\n" +
            "BRIDGE 0.5 ETH ethereum arbitrum +1234567890\n\n" +
            "Use CHAINS to see supported chains",
        };
      }

      const [amountStr, token, fromChain, toChain, toAddress] = args;
      const amount = amountStr.replace(/,/g, "");

      // Get user's wallet
      const wallet = await walletService.getWallet(phoneNumber);
      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      // Get chain IDs
      const chains = await lifiChainManager.getSupportedChains();
      const fromChainData = chains.find(
        (c) =>
          c.name.toLowerCase() === fromChain.toLowerCase() ||
          c.key.toLowerCase() === fromChain.toLowerCase()
      );
      const toChainData = chains.find(
        (c) =>
          c.name.toLowerCase() === toChain.toLowerCase() ||
          c.key.toLowerCase() === toChain.toLowerCase()
      );

      if (!fromChainData || !toChainData) {
        return {
          success: false,
          message: `Invalid chain. Use CHAINS to see supported chains.`,
        };
      }

      // Resolve destination address
      const resolvedToAddress = toAddress.startsWith("+")
        ? await this.resolvePhoneToAddress(toAddress)
        : toAddress;

      // Get quote first
      const quoteRequest = {
        fromChain: fromChainData.id,
        toChain: toChainData.id,
        fromToken: token.toUpperCase(),
        toToken: token.toUpperCase(),
        fromAmount: amount,
        fromAddress: wallet.address,
        toAddress: resolvedToAddress,
      };

      const quote = await lifiQuoteManager.getQuote(quoteRequest);

      return {
        success: true,
        message:
          `🌉 Bridge Quote Ready!\n\n` +
          `From: ${amount} ${token} on ${fromChainData.name}\n` +
          `To: ~${quote.estimate?.toAmount || "N/A"} ${token} on ${
            toChainData.name
          }\n` +
          `Estimated Time: ${Math.round(
            (quote.estimate?.executionDuration || 0) / 60
          )} min\n` +
          `Gas Fee: ${quote.estimate?.gasCosts?.[0]?.estimate || "N/A"}\n\n` +
          `⚠️ Cross-chain bridging is complex. This is a quote only.\n` +
          `For execution, use our web interface.`,
      };
    } catch (error) {
      console.error("Error handling bridge command:", error);
      return {
        success: false,
        message: "Error processing bridge request. Please try again later.",
      };
    }
  }

  private async handleSwapCommand(
    phoneNumber: string,
    args: string[],
    channel: "sms" | "whatsapp" = "sms"
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (args.length < 3) {
        return {
          success: false,
          message:
            "Invalid SWAP format. Use:\n\n" +
            "SWAP <amount> <fromToken> <toToken> [chain]\n\n" +
            "Examples:\n" +
            "SWAP 100 USDC ETH\n" +
            "SWAP 0.5 ETH USDC ethereum\n\n" +
            "Default chain: Current wallet chain",
        };
      }

      const [amountStr, fromToken, toToken, chain] = args;
      const amount = amountStr.replace(/,/g, "");

      // Get user's wallet
      const wallet = await walletService.getWallet(phoneNumber);
      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      // Default to Mantle chain or specified chain
      let chainId = env.MANTLE_CHAIN_ID;
      if (chain) {
        const chains = await lifiChainManager.getSupportedChains();
        const chainData = chains.find(
          (c) =>
            c.name.toLowerCase() === chain.toLowerCase() ||
            c.key.toLowerCase() === chain.toLowerCase()
        );
        if (chainData) {
          chainId = chainData.id;
        }
      }

      // Convert amount to wei format
      const fromAmountWei = await lifiService.convertAmountToWei(
        amount,
        fromToken,
        chainId
      );

      // Get quote
      const quoteRequest = {
        fromChain: chainId,
        toChain: chainId,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount: fromAmountWei,
        fromAddress: wallet.address,
      };

      const quote = await lifiQuoteManager.getQuote(quoteRequest);

      // Convert toAmount from wei to human-readable format
      let toAmountFormatted = "N/A";
      if (quote.estimate?.toAmount) {
        try {
          const toTokenData = await lifiService.getTokens(chainId);
          const toTokenInfo = toTokenData.find(
            (t) => t.symbol.toLowerCase() === toToken.toLowerCase()
          );
          const decimals = toTokenInfo?.decimals || 18;
          toAmountFormatted = lifiTokenManager.fromWei(
            quote.estimate.toAmount,
            decimals
          );
          // Format to reasonable decimal places
          const numAmount = parseFloat(toAmountFormatted);
          if (!isNaN(numAmount)) {
            toAmountFormatted = numAmount.toFixed(6).replace(/\.?0+$/, "");
          }
        } catch (error) {
          console.warn("Failed to format toAmount:", error);
          toAmountFormatted = quote.estimate.toAmount;
        }
      }

      const exchangeRate =
        toAmountFormatted !== "N/A" && amount
          ? (parseFloat(toAmountFormatted) / parseFloat(amount)).toFixed(4)
          : "N/A";

      // Send quote message first
      const quoteMessage =
        `💱 Swap Quote Generated\n\n` +
        `From: ${amount} ${fromToken.toUpperCase()}\n` +
        `To: ~${toAmountFormatted} ${toToken.toUpperCase()}\n` +
        `Rate: 1 ${fromToken.toUpperCase()} = ${exchangeRate} ${toToken.toUpperCase()}\n` +
        `Gas Fee: ${quote.estimate?.gasCosts?.[0]?.estimate || "N/A"}\n\n` +
        `⏳ Executing swap in 2 seconds...`;

      // Send quote message immediately
      await twilioService.sendMessage(phoneNumber, quoteMessage, channel);

      // Execute the swap automatically (with 2-second delay to avoid overwhelming LiFi endpoint)
      try {
        // Wait 2 seconds before execution
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const executionEngine = new LiFiExecutionEngineService();
        const executionRequest = {
          quote,
          fromAddress: wallet.address,
          toAddress: wallet.address,
        };

        console.log(`🚀 Executing swap for ${phoneNumber}:`, {
          from: `${amount} ${fromToken.toUpperCase()}`,
          to: `~${toAmountFormatted} ${toToken.toUpperCase()}`,
          wallet: wallet.address,
        });

        const executionResult = await executionEngine.executeTransaction(
          executionRequest
        );

        if (executionResult.success && executionResult.transactionHash) {
          // Get explorer URL for the chain
          const chainMetadata = lifiChainManager.getChainMetadata(chainId);
          const explorerUrl =
            chainMetadata?.blockExplorer || "https://explorer.mantle.xyz";
          const explorerLink = `${explorerUrl}/tx/${executionResult.transactionHash}`;

          const successMessage =
            `✅ Swap Executed Successfully!\n\n` +
            `From: ${amount} ${fromToken.toUpperCase()}\n` +
            `To: ~${toAmountFormatted} ${toToken.toUpperCase()}\n` +
            `Rate: 1 ${fromToken.toUpperCase()} = ${exchangeRate} ${toToken.toUpperCase()}\n` +
            `Gas Fee: ${quote.estimate?.gasCosts?.[0]?.estimate || "N/A"}\n\n` +
            `🔗 Transaction Hash: ${executionResult.transactionHash}\n` +
            `🌐 View on Explorer: ${explorerLink}\n` +
            `⏱️ Execution Time: ${Math.round(
              (executionResult.executionTime || 0) / 1000
            )}s`;

          // Send success message
          await twilioService.sendMessage(phoneNumber, successMessage, channel);
        } else {
          const failureMessage =
            `❌ Swap Execution Failed\n\n` +
            `Quote: ${amount} ${fromToken.toUpperCase()} → ~${toAmountFormatted} ${toToken.toUpperCase()}\n` +
            `Error: ${executionResult.error || "Unknown execution error"}\n\n` +
            `Please try again or contact support.`;

          // Send failure message
          await twilioService.sendMessage(phoneNumber, failureMessage, channel);
        }
      } catch (executionError) {
        console.error("Swap execution failed:", executionError);
        const errorMessage =
          `❌ Swap Execution Failed\n\n` +
          `Quote: ${amount} ${fromToken.toUpperCase()} → ~${toAmountFormatted} ${toToken.toUpperCase()}\n` +
          `Error: ${
            executionError instanceof Error
              ? executionError.message
              : String(executionError)
          }\n\n` +
          `Please try again or contact support.`;

        // Send error message
        await twilioService.sendMessage(phoneNumber, errorMessage, channel);
      }

      // Return simple acknowledgment since actual results are sent separately
      return {
        success: true,
        message: `💱 Swap initiated! You'll receive updates on the execution status.`,
      };
    } catch (error) {
      console.error("Error handling swap command:", error);
      return {
        success: false,
        message: "Error processing swap request. Please try again later.",
      };
    }
  }

  private async handleQuoteCommand(
    phoneNumber: string,
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (args.length < 3) {
        return {
          success: false,
          message:
            "Invalid QUOTE format. Use:\n\n" +
            "QUOTE <amount> <fromToken> <toToken> [fromChain] [toChain]\n\n" +
            "Examples:\n" +
            "QUOTE 100 USDC ETH\n" +
            "QUOTE 10 ETH USDC ethereum polygon\n\n" +
            "For same-chain swaps, omit chain parameters",
        };
      }

      const [amountStr, fromToken, toToken, fromChain, toChain] = args;
      const amount = amountStr.replace(/,/g, "");

      // Get user's wallet
      const wallet = await walletService.getWallet(phoneNumber);
      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet.",
        };
      }

      // Determine chain IDs
      let fromChainId = env.MANTLE_CHAIN_ID;
      let toChainId = env.MANTLE_CHAIN_ID;

      if (fromChain && toChain) {
        const chains = await lifiChainManager.getSupportedChains();
        const fromChainData = chains.find(
          (c) =>
            c.name.toLowerCase() === fromChain.toLowerCase() ||
            c.key.toLowerCase() === fromChain.toLowerCase()
        );
        const toChainData = chains.find(
          (c) =>
            c.name.toLowerCase() === toChain.toLowerCase() ||
            c.key.toLowerCase() === toChain.toLowerCase()
        );

        if (fromChainData) fromChainId = fromChainData.id;
        if (toChainData) toChainId = toChainData.id;
      }

      // Convert amount to wei format
      const fromAmountWei = await lifiService.convertAmountToWei(
        amount,
        fromToken,
        fromChainId
      );

      // Get quote
      const quoteRequest = {
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount: fromAmountWei,
        fromAddress: wallet.address,
      };

      const quote = await lifiQuoteManager.getQuote(quoteRequest);

      const isCrossChain = fromChainId !== toChainId;
      const typeIcon = isCrossChain ? "🌉" : "🔄";
      const typeText = isCrossChain ? "Cross-Chain" : "Swap";

      // Convert toAmount from wei to human-readable format
      let toAmountFormatted = "N/A";
      if (quote.estimate?.toAmount) {
        try {
          const toTokenData = await lifiService.getTokens(toChainId);
          const toTokenInfo = toTokenData.find(
            (t) => t.symbol.toLowerCase() === toToken.toLowerCase()
          );
          const decimals = toTokenInfo?.decimals || 18;
          toAmountFormatted = lifiTokenManager.fromWei(
            quote.estimate.toAmount,
            decimals
          );
          // Format to reasonable decimal places
          const numAmount = parseFloat(toAmountFormatted);
          if (!isNaN(numAmount)) {
            toAmountFormatted = numAmount.toFixed(6).replace(/\.?0+$/, "");
          }
        } catch (error) {
          console.warn("Failed to format toAmount:", error);
          toAmountFormatted = quote.estimate.toAmount;
        }
      }

      const exchangeRate =
        toAmountFormatted !== "N/A" && amount
          ? (parseFloat(toAmountFormatted) / parseFloat(amount)).toFixed(4)
          : "N/A";

      return {
        success: true,
        message:
          `${typeIcon} ${typeText} Quote\n\n` +
          `From: ${amount} ${fromToken.toUpperCase()}\n` +
          `To: ~${toAmountFormatted} ${toToken.toUpperCase()}\n` +
          `${
            isCrossChain
              ? `From Chain: ${fromChain || "Mantle"}\nTo Chain: ${
                  toChain || "Mantle"
                }\n`
              : ""
          }` +
          `Rate: 1 ${fromToken.toUpperCase()} = ${exchangeRate} ${toToken.toUpperCase()}\n` +
          `Gas Fee: ${quote.estimate?.gasCosts?.[0]?.estimate || "N/A"}\n` +
          `${
            isCrossChain
              ? `Estimated Time: ${Math.round(
                  (quote.estimate?.executionDuration || 0) / 60
                )} min\n`
              : ""
          }\n` +
          `⚠️ Quote only. Use web interface for execution.`,
      };
    } catch (error) {
      console.error("Error handling quote command:", error);
      return {
        success: false,
        message: "Error getting quote. Please try again later.",
      };
    }
  }

  private async handleChainsCommand(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const chains = await lifiChainManager.getSupportedChains();

      if (!chains || chains.length === 0) {
        return {
          success: false,
          message: "No supported chains found.",
        };
      }

      let message = "🔗 Supported Chains:\n\n";

      // Show top 10 most popular chains
      const popularChains = chains.slice(0, 10);

      for (const chain of popularChains) {
        message += `• ${chain.name} (${chain.key})\n`;
        message += `  Chain ID: ${chain.id}\n\n`;
      }

      if (chains.length > 10) {
        message += `... and ${chains.length - 10} more chains\n\n`;
      }

      message += "Use chain names or keys in BRIDGE/SWAP commands";

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error("Error handling chains command:", error);
      return {
        success: false,
        message: "Error retrieving supported chains.",
      };
    }
  }

  private async resolvePhoneToAddress(phoneNumber: string): Promise<string> {
    try {
      const wallet = await walletService.getWallet(phoneNumber);
      return wallet?.address || phoneNumber;
    } catch (error) {
      return phoneNumber;
    }
  }

  private async handleHistoryCommand(
    phoneNumber: string,
    args: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const transactionHistoryService = new TransactionHistoryService();
      const limit = args[0] ? parseInt(args[0]) : 10;
      const validLimit = Math.min(Math.max(limit, 1), 20); // Limit between 1-20

      const transactions =
        await transactionHistoryService.getUserTransactionHistory(
          phoneNumber,
          validLimit,
          0
        );

      if (!transactions || transactions.length === 0) {
        return {
          success: true,
          message:
            "📋 No transaction history found.\n\nStart using SEND, BRIDGE, or SWAP commands to build your transaction history!",
        };
      }

      let message = `📋 Recent Transactions (${transactions.length}):\n\n`;

      for (const tx of transactions) {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const typeIcon =
          tx.type === "transfer" ? "💸" : tx.type === "bridge" ? "🌉" : "🔄";
        const status =
          tx.status === "completed"
            ? "✅"
            : tx.status === "failed"
            ? "❌"
            : "⏳";

        message += `${typeIcon} ${tx.type.toUpperCase()} ${status}\n`;
        message += `Amount: ${tx.fromToken.amount} ${tx.fromToken.symbol}\n`;

        // Show recipient information for transfers
        if (tx.type === "transfer" && (tx.recipientPhone || tx.recipient)) {
          const recipientInfo = tx.recipientPhone || tx.recipient || "Unknown";
          message += `To: ${recipientInfo}\n`;
        } else if (tx.toToken && tx.toToken.symbol !== tx.fromToken.symbol) {
          message += `To: ${tx.toToken.amount || "N/A"} ${tx.toToken.symbol}\n`;
        }

        message += `Date: ${date}\n`;

        // Show complete hash with explorer link
        if (tx.txHash) {
          const chainMetadata = lifiChainManager.getChainMetadata(
            tx.fromToken.chainId
          );
          if (chainMetadata && chainMetadata.blockExplorer) {
            const explorerUrl = `${chainMetadata.blockExplorer}/tx/${tx.txHash}`;
            message += `Hash: ${tx.txHash}\n`;
            message += `Explorer: ${explorerUrl}\n`;
          } else {
            message += `Hash: ${tx.txHash}\n`;
          }
        }
        message += `\n`;
      }

      message += `Reply "HISTORY 20" for more transactions\nReply "STATS" for transaction statistics`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error("Error handling history command:", error);
      return {
        success: false,
        message: "Error retrieving transaction history. Please try again.",
      };
    }
  }

  private async handleStatsCommand(
    phoneNumber: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const transactionHistoryService = new TransactionHistoryService();
      const stats = await transactionHistoryService.getUserTransactionStats(
        phoneNumber
      );

      if (!stats) {
        return {
          success: true,
          message:
            "📊 No transaction statistics available.\n\nStart using SEND, BRIDGE, or SWAP commands to build your transaction history!",
        };
      }

      const volumeEntries = Object.entries(stats.totalVolume);
      const volumeText =
        volumeEntries.length > 0
          ? volumeEntries
              .map(([token, amount]) => `${token}: ${amount}`)
              .join(", ")
          : "No volume data";

      const message =
        `📊 Your Transaction Statistics:\n\n` +
        `Total Transactions: ${stats.total}\n` +
        `Successful: ${stats.completed} ✅\n` +
        `Failed: ${stats.failed} ❌\n` +
        `Pending: ${stats.pending} ⏳\n\n` +
        `💰 Volume by Token:\n${volumeText}\n\n` +
        `Reply "HISTORY" to see recent transactions`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error("Error handling stats command:", error);
      return {
        success: false,
        message: "Error retrieving transaction statistics. Please try again.",
      };
    }
  }

  private handleMonitorCommand(): { success: boolean; message: string } {
    try {
      const stats = lifiMonitoring.getStats();
      const recommendations = lifiMonitoring.getOptimizationRecommendations();

      const message =
        `📊 LI.FI Performance Monitor:\n\n` +
        `⏱️ Uptime: ${stats.uptime.hours}h\n` +
        `📡 API Calls: ${stats.apiUsage.totalCalls} (${stats.apiUsage.callsPerHour}/hr)\n` +
        `🚨 Rate Limits: ${stats.apiUsage.rateLimitHits} hits (${stats.apiUsage.rateLimitHitRate})\n` +
        `💾 Cache Hit Rate: ${stats.cache.hitRate}\n` +
        `🔄 Available Tokens: ${stats.rateLimiter.availableTokens}/${stats.rateLimiter.maxTokens}\n\n` +
        `💡 Recommendations:\n` +
        recommendations.map((rec) => `• ${rec}`).join("\n") +
        `\n\nReply "HELP" for available commands`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      console.error("Error handling monitor command:", error);
      return {
        success: false,
        message: "Error retrieving performance stats. Please try again.",
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
