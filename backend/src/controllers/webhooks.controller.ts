import { Request, Response } from "express";
import { walletService } from "../services/wallet.service";
import { WhatsappPayload } from "../types";

// TODO: ✅ Task 6: Implement WhatsApp webhook handler
// TODO: ✅ Task 7: Implement SMS webhook handler
// TODO: ✅ Task 8: Implement input validation and sanitization
// TODO: ✅ Task 9: Implement command parsing
// TODO: ✅ Task 10: Implement error handling

export class WebhooksController {
  
  // ✅ Task 8: Sanitize and validate incoming message data
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

  // ✅ Task 9: Parse and validate phone number from Twilio format
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

  // ✅ Task 9: Parse user commands
  private parseCommand(message: string): { command: string; args: string[] } {
    const sanitized = this.sanitizeInput(message);
    const parts = sanitized.split(/\s+/).filter(part => part.length > 0);
    
    return {
      command: parts[0] || "",
      args: parts.slice(1)
    };
  }

  // ✅ Task 6: Handle incoming WhatsApp messages
  async handleWhatsAppWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log("WhatsApp webhook received:", req.body);
      
      const { Body, From, To } = req.body as WhatsappPayload;
      
      if (!Body || !From) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Extract phone number and parse command
      const phoneNumber = this.extractPhoneNumber(From);
      const { command, args } = this.parseCommand(Body);
      
      console.log(`WhatsApp command from ${phoneNumber}: ${command}`);

      // Handle different commands
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
          
        case "HELP":
        case "COMMANDS":
          response = this.handleHelpCommand();
          break;
          
        default:
          response = {
            success: false,
            message: "Unknown command. Reply HELP to see available commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, HELP"
          };
      }

      // Send response via TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response.message}</Message>
</Response>`;
      
      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);
      
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error processing your request. Please try again later.</Message>
</Response>`;
      
      res.set("Content-Type", "text/xml");
      res.status(200).send(errorTwiml);
    }
  }

  // ✅ Task 7: Handle incoming SMS messages
  async handleSMSWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log("SMS webhook received:", req.body);
      
      const { Body, From, To } = req.body;
      
      if (!Body || !From) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Extract phone number and parse command
      const phoneNumber = this.extractPhoneNumber(From);
      const { command, args } = this.parseCommand(Body);
      
      console.log(`SMS command from ${phoneNumber}: ${command}`);

      // Handle different commands
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
          
        case "HELP":
        case "COMMANDS":
          response = this.handleHelpCommand();
          break;
          
        default:
          response = {
            success: false,
            message: "Unknown command. Reply HELP for commands.\n\nAvailable: CREATE, BALANCE, ADDRESS, HELP"
          };
      }

      // Send response via TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response.message}</Message>
</Response>`;
      
      res.set("Content-Type", "text/xml");
      res.status(200).send(twiml);
      
    } catch (error) {
      console.error("SMS webhook error:", error);
      
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error. Please try again later.</Message>
</Response>`;
      
      res.set("Content-Type", "text/xml");
      res.status(200).send(errorTwiml);
    }
  }

  // Handle balance command
  private async handleBalanceCommand(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const wallet = await walletService.getWallet(phoneNumber);
      
      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet."
        };
      }

      // TODO: Implement balance checking with Mantle RPC
      // For now, return wallet address
      return {
        success: true,
        message: `Your wallet: ${wallet.address}\n\nBalance checking coming soon! Use a block explorer to check your balance.`
      };
    } catch (error) {
      console.error("Error handling balance command:", error);
      return {
        success: false,
        message: "Error checking balance. Please try again."
      };
    }
  }

  // Handle address command
  private async handleAddressCommand(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const wallet = await walletService.getWallet(phoneNumber);
      
      if (!wallet) {
        return {
          success: false,
          message: "No wallet found. Reply CREATE to create a new wallet."
        };
      }

      return {
        success: true,
        message: `Your Mantle wallet address:\n${wallet.address}\n\nNetwork: Mantle (Chain ID: 5000)\nSave this address safely!`
      };
    } catch (error) {
      console.error("Error handling address command:", error);
      return {
        success: false,
        message: "Error retrieving address. Please try again."
      };
    }
  }

  // Handle help command
  private handleHelpCommand(): { success: boolean; message: string } {
    const helpMessage = `🔹 Zest Wallet Commands:\n\n` +
      `CREATE - Create a new wallet\n` +
      `BALANCE - Check wallet balance\n` +
      `ADDRESS - Get wallet address\n` +
      `HELP - Show this help\n\n` +
      `Send any command to get started!\n` +
      `Network: Mantle (Chain ID: 5000)`;

    return {
      success: true,
      message: helpMessage
    };
  }

  // Health check endpoint
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: "healthy",
      service: "zest-wallet-webhooks",
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const webhooksController = new WebhooksController();