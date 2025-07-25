import { lifiService } from "./lifi.service";
import { lifiChainManager } from "./lifi-chain-manager.service";
import { LiFiToken } from "../types";

/**
 * Token Manager Service for LI.FI
 * Handles token-specific operations, validations, and metadata
 */
export class LiFiTokenManager {
  private tokenCache: Map<string, LiFiToken> = new Map();
  private tokenListCache: Map<number, LiFiToken[]> = new Map();
  private tokenMetadata: Map<string, TokenMetadata> = new Map();
  private popularTokens: Map<number, string[]> = new Map();

  constructor() {
    this.initializePopularTokens();
    // Preload tokens for popular chains in background to reduce API calls
    this.preloadPopularChainTokens();
  }

  /**
   * Preload tokens for popular chains in background
   */
  private async preloadPopularChainTokens(): Promise<void> {
    // Popular chains to preload (most commonly used)
    const popularChains = [1, 137, 56, 42161, 10, 5000]; // ETH, Polygon, BSC, Arbitrum, Optimism, Mantle
    
    // Delay preloading to avoid hitting rate limits on startup
    setTimeout(async () => {
      for (const chainId of popularChains) {
        try {
          // Add delay between each chain to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.getTokensForChain(chainId);
        } catch (error) {
          console.warn(`⚠️ Failed to preload tokens for chain ${chainId}:`, error);
        }
      }
      console.log(`🚀 Preloaded tokens for ${popularChains.length} popular chains`);
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Initialize popular tokens for each chain
   */
  private initializePopularTokens(): void {
    const popularTokensByChain: Record<number, string[]> = {
      // Ethereum
      1: [
        "ETH",
        "USDC",
        "USDT",
        "DAI",
        "WETH",
        "WBTC",
        "UNI",
        "LINK",
        "AAVE",
        "COMP",
      ],
      // Polygon
      137: [
        "MATIC",
        "USDC",
        "USDT",
        "DAI",
        "WETH",
        "WBTC",
        "AAVE",
        "UNI",
        "LINK",
        "SUSHI",
      ],
      // BSC
      56: [
        "BNB",
        "USDT",
        "BUSD",
        "USDC",
        "ETH",
        "BTCB",
        "CAKE",
        "ADA",
        "DOT",
        "UNI",
      ],
      // Arbitrum
      42161: [
        "ETH",
        "USDC",
        "USDT",
        "DAI",
        "WBTC",
        "UNI",
        "LINK",
        "ARB",
        "GMX",
        "MAGIC",
      ],
      // Optimism
      10: [
        "ETH",
        "USDC",
        "USDT",
        "DAI",
        "WBTC",
        "OP",
        "UNI",
        "LINK",
        "SNX",
        "AAVE",
      ],
      // Avalanche
      43114: [
        "AVAX",
        "USDC",
        "USDT",
        "DAI",
        "WETH",
        "WBTC",
        "UNI",
        "LINK",
        "AAVE",
        "JOE",
      ],
      // Fantom
      250: [
        "FTM",
        "USDC",
        "fUSDT",
        "DAI",
        "WETH",
        "WBTC",
        "BOO",
        "SPIRIT",
        "TOMB",
        "SPELL",
      ],
      // Mantle
      5000: ["MNT", "USDC", "USDT", "WETH", "WBTC"],
      // Mantle Sepolia
      5003: ["MNT", "USDC", "USDT", "WETH"],
    };

    Object.entries(popularTokensByChain).forEach(([chainId, tokens]) => {
      this.popularTokens.set(parseInt(chainId), tokens);
    });

    console.log(
      `🏆 Initialized popular tokens for ${this.popularTokens.size} chains`
    );
  }

  /**
   * Get all tokens for a specific chain
   */
  async getTokensForChain(chainId: number): Promise<LiFiToken[]> {
    // Check cache first
    if (this.tokenListCache.has(chainId)) {
      return this.tokenListCache.get(chainId) || [];
    }

    try {
      const tokens = await lifiService.getTokens(chainId);

      // Cache tokens
      this.tokenListCache.set(chainId, tokens);

      // Cache individual tokens
      tokens.forEach((token) => {
        const tokenKey = this.getTokenKey(chainId, token.address);
        this.tokenCache.set(tokenKey, token);
      });

      console.log(`💰 Loaded ${tokens.length} tokens for chain ${chainId}`);
      return tokens;
    } catch (error) {
      console.error(`❌ Failed to get tokens for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Find token by symbol
   */
  async findTokenBySymbol(
    chainId: number,
    symbol: string
  ): Promise<LiFiToken | null> {
    const tokens = await this.getTokensForChain(chainId);
    return (
      tokens.find(
        (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
      ) || null
    );
  }

  /**
   * Find token by address
   */
  async findTokenByAddress(
    chainId: number,
    address: string
  ): Promise<LiFiToken | null> {
    const tokenKey = this.getTokenKey(chainId, address);

    // Check cache first
    if (this.tokenCache.has(tokenKey)) {
      return this.tokenCache.get(tokenKey) || null;
    }

    const tokens = await this.getTokensForChain(chainId);
    return (
      tokens.find(
        (token) => token.address.toLowerCase() === address.toLowerCase()
      ) || null
    );
  }

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(
    chainId: number,
    query: string,
    limit: number = 10
  ): Promise<LiFiToken[]> {
    const tokens = await this.getTokensForChain(chainId);
    const searchQuery = query.toLowerCase();

    const matchingTokens = tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(searchQuery) ||
        token.name.toLowerCase().includes(searchQuery)
    );

    // Sort by relevance (exact matches first, then partial matches)
    const sortedTokens = matchingTokens.sort((a, b) => {
      const aSymbolExact = a.symbol.toLowerCase() === searchQuery;
      const bSymbolExact = b.symbol.toLowerCase() === searchQuery;
      const aNameExact = a.name.toLowerCase() === searchQuery;
      const bNameExact = b.name.toLowerCase() === searchQuery;

      if (aSymbolExact && !bSymbolExact) return -1;
      if (!aSymbolExact && bSymbolExact) return 1;
      if (aNameExact && !bNameExact) return -1;
      if (!aNameExact && bNameExact) return 1;

      // Secondary sort by symbol length (shorter symbols first)
      return a.symbol.length - b.symbol.length;
    });

    return sortedTokens.slice(0, limit);
  }

  /**
   * Get popular tokens for a chain
   */
  async getPopularTokens(
    chainId: number,
    limit: number = 10
  ): Promise<LiFiToken[]> {
    const popularSymbols = this.popularTokens.get(chainId) || [];
    const tokens = await this.getTokensForChain(chainId);

    const popularTokensList: LiFiToken[] = [];

    // Find tokens by popular symbols in order
    for (const symbol of popularSymbols) {
      const token = tokens.find(
        (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
      );
      if (token) {
        popularTokensList.push(token);
        if (popularTokensList.length >= limit) break;
      }
    }

    // If we don't have enough popular tokens, fill with other tokens
    if (popularTokensList.length < limit) {
      const remainingTokens = tokens
        .filter(
          (token) =>
            !popularTokensList.some((pt) => pt.address === token.address)
        )
        .sort((a, b) => b.decimals - a.decimals) // Sort by decimals (higher precision first)
        .slice(0, limit - popularTokensList.length);

      popularTokensList.push(...remainingTokens);
    }

    return popularTokensList;
  }

  /**
   * Get native token for a chain
   */
  async getNativeToken(chainId: number): Promise<LiFiToken | null> {
    const tokens = await this.getTokensForChain(chainId);
    const chainMetadata = lifiChainManager.getChainMetadata(chainId);

    if (!chainMetadata) return null;

    // Find native token (usually has address '0x0000000000000000000000000000000000000000')
    return (
      tokens.find(
        (token) =>
          token.address === "0x0000000000000000000000000000000000000000" ||
          token.symbol === chainMetadata.nativeCurrency
      ) || null
    );
  }

  /**
   * Validate token address format
   */
  isValidTokenAddress(address: string): boolean {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  /**
   * Validate token amount
   */
  isValidTokenAmount(amount: string, decimals: number): boolean {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return false;
      }

      // Check if amount has too many decimal places
      const decimalPlaces = (amount.split(".")[1] || "").length;
      return decimalPlaces <= decimals;
    } catch {
      return false;
    }
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(
    amount: string,
    decimals: number,
    displayDecimals: number = 6
  ): string {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return "0";

      // For very small amounts, show more decimals
      if (numAmount < 0.001) {
        return numAmount.toFixed(Math.min(decimals, 8));
      }

      // For normal amounts, limit display decimals
      return numAmount.toFixed(Math.min(displayDecimals, decimals));
    } catch {
      return "0";
    }
  }

  /**
   * Convert token amount to wei (smallest unit)
   */
  toWei(amount: string, decimals: number): string {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return "0";

      const multiplier = Math.pow(10, decimals);
      const weiAmount = Math.floor(numAmount * multiplier);
      return weiAmount.toString();
    } catch {
      return "0";
    }
  }

  /**
   * Convert wei to token amount
   */
  fromWei(weiAmount: string, decimals: number): string {
    try {
      const numWei = parseFloat(weiAmount);
      if (isNaN(numWei)) return "0";

      const divisor = Math.pow(10, decimals);
      const tokenAmount = numWei / divisor;
      return tokenAmount.toString();
    } catch {
      return "0";
    }
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(
    chainId: number,
    address: string
  ): Promise<TokenMetadata | null> {
    const tokenKey = this.getTokenKey(chainId, address);

    // Check cache first
    if (this.tokenMetadata.has(tokenKey)) {
      return this.tokenMetadata.get(tokenKey) || null;
    }

    const token = await this.findTokenByAddress(chainId, address);
    if (!token) return null;

    const metadata: TokenMetadata = {
      chainId,
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      isNative: token.address === "0x0000000000000000000000000000000000000000",
      isPopular: this.isPopularToken(chainId, token.symbol),
      tags: this.getTokenTags(token),
    };

    // Cache metadata
    this.tokenMetadata.set(tokenKey, metadata);

    return metadata;
  }

  /**
   * Check if token is popular on a chain
   */
  private isPopularToken(chainId: number, symbol: string): boolean {
    const popularSymbols = this.popularTokens.get(chainId) || [];
    return popularSymbols.includes(symbol.toUpperCase());
  }

  /**
   * Get token tags based on properties
   */
  private getTokenTags(token: LiFiToken): string[] {
    const tags: string[] = [];

    if (token.address === "0x0000000000000000000000000000000000000000") {
      tags.push("native");
    }

    if (
      token.symbol.includes("USD") ||
      ["USDC", "USDT", "DAI", "BUSD"].includes(token.symbol)
    ) {
      tags.push("stablecoin");
    }

    if (token.symbol.startsWith("W") && token.symbol.length <= 5) {
      tags.push("wrapped");
    }

    if (token.decimals === 18) {
      tags.push("standard");
    }

    return tags;
  }

  /**
   * Generate token cache key
   */
  private getTokenKey(chainId: number, address: string): string {
    return `${chainId}_${address.toLowerCase()}`;
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    return {
      cachedTokens: this.tokenCache.size,
      cachedTokenLists: this.tokenListCache.size,
      cachedMetadata: this.tokenMetadata.size,
      popularTokenChains: this.popularTokens.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.tokenCache.clear();
    this.tokenListCache.clear();
    this.tokenMetadata.clear();
    console.log("🧹 Token manager cache cleared");
  }

  /**
   * Validate token pair for swapping
   */
  async validateTokenPair(
    fromChainId: number,
    fromToken: string,
    toChainId: number,
    toToken: string
  ): Promise<TokenPairValidation> {
    const validation: TokenPairValidation = {
      isValid: false,
      fromTokenValid: false,
      toTokenValid: false,
      errors: [],
    };

    try {
      // Validate from token
      const fromTokenData =
        (await this.findTokenByAddress(fromChainId, fromToken)) ||
        (await this.findTokenBySymbol(fromChainId, fromToken));

      if (!fromTokenData) {
        validation.errors.push(
          `From token '${fromToken}' not found on chain ${fromChainId}`
        );
      } else {
        validation.fromTokenValid = true;
      }

      // Validate to token
      const toTokenData =
        (await this.findTokenByAddress(toChainId, toToken)) ||
        (await this.findTokenBySymbol(toChainId, toToken));

      if (!toTokenData) {
        validation.errors.push(
          `To token '${toToken}' not found on chain ${toChainId}`
        );
      } else {
        validation.toTokenValid = true;
      }

      // Check if same token on same chain
      if (
        fromChainId === toChainId &&
        fromTokenData &&
        toTokenData &&
        fromTokenData.address === toTokenData.address
      ) {
        validation.errors.push("Cannot swap token to itself on the same chain");
      }

      validation.isValid =
        validation.fromTokenValid &&
        validation.toTokenValid &&
        validation.errors.length === 0;
    } catch (error) {
      validation.errors.push(`Validation error: ${error}`);
    }

    return validation;
  }
}

/**
 * Token metadata interface
 */
export interface TokenMetadata {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isNative: boolean;
  isPopular: boolean;
  tags: string[];
}

/**
 * Token pair validation result
 */
export interface TokenPairValidation {
  isValid: boolean;
  fromTokenValid: boolean;
  toTokenValid: boolean;
  errors: string[];
}

// Export singleton instance
export const lifiTokenManager = new LiFiTokenManager();
export default lifiTokenManager;
