import { Request, Response } from "express";
import { walletService } from "../services/wallet.service";
import { 
  addToken, 
  toggleToken, 
  getEnabledTokens, 
  getTokenConfig, 
  isTokenSupported, 
  getSupportedTokenSymbols,
  TokenConfig 
} from "../config/tokens";
import { blockchainService } from "../services/blockchain.service";

export class TokensController {
  /**
   * Get all supported tokens
   */
  async getTokens(req: Request, res: Response): Promise<void> {
    try {
      const tokens = getEnabledTokens();
      
      res.status(200).json({
        success: true,
        data: {
          tokens,
          count: Object.keys(tokens).length,
          symbols: getSupportedTokenSymbols()
        }
      });
    } catch (error) {
      console.error("Error getting tokens:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve tokens"
      });
    }
  }

  /**
   * Add a new token
   */
  async addToken(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, name, address, decimals = 18, enabled = true } = req.body;

      // Validate required fields
      if (!symbol || !name || !address) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: symbol, name, address"
        });
        return;
      }

      // Validate address format
      if (!blockchainService.isValidAddress(address)) {
        res.status(400).json({
          success: false,
          message: "Invalid contract address format"
        });
        return;
      }

      // Validate decimals
      if (typeof decimals !== 'number' || decimals < 0 || decimals > 18) {
        res.status(400).json({
          success: false,
          message: "Decimals must be a number between 0 and 18"
        });
        return;
      }

      const result = await walletService.addNewToken(
        symbol,
        name,
        address,
        decimals,
        enabled
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            token: getTokenConfig(symbol.toUpperCase())
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Error adding token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add token"
      });
    }
  }

  /**
   * Toggle token status (enable/disable)
   */
  async toggleToken(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          message: "'enabled' field must be a boolean"
        });
        return;
      }

      const result = await walletService.toggleTokenStatus(symbol, enabled);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            token: getTokenConfig(symbol.toUpperCase())
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Error toggling token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle token status"
      });
    }
  }

  /**
   * Get specific token information
   */
  async getToken(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const tokenConfig = getTokenConfig(symbol.toUpperCase());

      if (!tokenConfig) {
        res.status(404).json({
          success: false,
          message: `Token ${symbol.toUpperCase()} not found`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          token: tokenConfig,
          isSupported: isTokenSupported(symbol)
        }
      });
    } catch (error) {
      console.error("Error getting token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve token information"
      });
    }
  }

  /**
   * Validate a token contract (check if it's a valid ERC-20)
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          message: "Contract address is required"
        });
        return;
      }

      if (!blockchainService.isValidAddress(address)) {
        res.status(400).json({
          success: false,
          message: "Invalid contract address format"
        });
        return;
      }

      try {
        // Try to get token information to validate it's a proper ERC-20
        const dummyAddress = "0x0000000000000000000000000000000000000000";
        await blockchainService.getTokenBalance(address, dummyAddress);
        
        res.status(200).json({
          success: true,
          message: "Token contract appears to be valid",
          data: {
            address,
            isValid: true
          }
        });
      } catch (tokenError) {
        res.status(400).json({
          success: false,
          message: "Invalid or non-ERC20 token contract",
          data: {
            address,
            isValid: false,
            error: tokenError instanceof Error ? tokenError.message : "Unknown error"
          }
        });
      }
    } catch (error) {
      console.error("Error validating token:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate token contract"
      });
    }
  }
}

export const tokensController = new TokensController();