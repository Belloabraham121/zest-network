import { lifiService } from "./lifi.service";
import { lifiConfig, isChainSupported, getChainConfig } from "../config/lifi";
import { LiFiChain, LiFiToken } from "../types";

/**
 * Chain Manager Service for LI.FI
 * Handles chain-specific operations and configurations
 */
export class LiFiChainManager {
  private chainCache: Map<number, LiFiChain> = new Map();
  private tokenCache: Map<string, LiFiToken[]> = new Map();
  private chainMetadata: Map<number, ChainMetadata> = new Map();

  constructor() {
    this.initializeChainMetadata();
  }

  /**
   * Initialize chain metadata for supported chains
   */
  private initializeChainMetadata(): void {
    const chainMetadata: Record<number, ChainMetadata> = {
      // Ethereum Mainnet
      1: {
        name: "Ethereum",
        symbol: "ETH",
        nativeCurrency: "ETH",
        blockExplorer: "https://etherscan.io",
        rpcUrls: [
          "https://mainnet.infura.io/v3/",
          "https://eth-mainnet.alchemyapi.io/v2/",
        ],
        isTestnet: false,
        avgBlockTime: 12,
        gasMultiplier: 1.1,
      },
      // Polygon
      137: {
        name: "Polygon",
        symbol: "MATIC",
        nativeCurrency: "MATIC",
        blockExplorer: "https://polygonscan.com",
        rpcUrls: [
          "https://polygon-rpc.com/",
          "https://rpc-mainnet.matic.network",
        ],
        isTestnet: false,
        avgBlockTime: 2,
        gasMultiplier: 1.2,
      },
      // BSC
      56: {
        name: "BNB Smart Chain",
        symbol: "BNB",
        nativeCurrency: "BNB",
        blockExplorer: "https://bscscan.com",
        rpcUrls: [
          "https://bsc-dataseed.binance.org/",
          "https://bsc-dataseed1.defibit.io/",
        ],
        isTestnet: false,
        avgBlockTime: 3,
        gasMultiplier: 1.1,
      },
      // Arbitrum
      42161: {
        name: "Arbitrum One",
        symbol: "ETH",
        nativeCurrency: "ETH",
        blockExplorer: "https://arbiscan.io",
        rpcUrls: [
          "https://arb1.arbitrum.io/rpc",
          "https://arbitrum-mainnet.infura.io/v3/",
        ],
        isTestnet: false,
        avgBlockTime: 1,
        gasMultiplier: 1.0,
      },
      // Optimism
      10: {
        name: "Optimism",
        symbol: "ETH",
        nativeCurrency: "ETH",
        blockExplorer: "https://optimistic.etherscan.io",
        rpcUrls: [
          "https://mainnet.optimism.io",
          "https://optimism-mainnet.infura.io/v3/",
        ],
        isTestnet: false,
        avgBlockTime: 2,
        gasMultiplier: 1.0,
      },
      // Avalanche
      43114: {
        name: "Avalanche",
        symbol: "AVAX",
        nativeCurrency: "AVAX",
        blockExplorer: "https://snowtrace.io",
        rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
        isTestnet: false,
        avgBlockTime: 2,
        gasMultiplier: 1.1,
      },
      // Fantom
      250: {
        name: "Fantom",
        symbol: "FTM",
        nativeCurrency: "FTM",
        blockExplorer: "https://ftmscan.com",
        rpcUrls: ["https://rpc.ftm.tools/", "https://rpc.ankr.com/fantom/"],
        isTestnet: false,
        avgBlockTime: 1,
        gasMultiplier: 1.1,
      },
      // Mantle Mainnet
      5000: {
        name: "Mantle",
        symbol: "MNT",
        nativeCurrency: "MNT",
        blockExplorer: "https://explorer.mantle.xyz",
        rpcUrls: ["https://rpc.mantle.xyz"],
        isTestnet: false,
        avgBlockTime: 2,
        gasMultiplier: 1.2,
      },
      // Mantle Sepolia Testnet
      5003: {
        name: "Mantle Sepolia",
        symbol: "MNT",
        nativeCurrency: "MNT",
        blockExplorer: "https://explorer.sepolia.mantle.xyz",
        rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
        isTestnet: true,
        avgBlockTime: 2,
        gasMultiplier: 1.2,
      },
    };

    // Populate chain metadata map
    Object.entries(chainMetadata).forEach(([chainId, metadata]) => {
      this.chainMetadata.set(parseInt(chainId), metadata);
    });

    console.log(
      `📋 Initialized metadata for ${this.chainMetadata.size} chains`
    );
  }

  /**
   * Get all supported chains
   */
  async getSupportedChains(): Promise<LiFiChain[]> {
    try {
      const chains = await lifiService.getChains();

      // Filter to only supported chains
      const supportedChains = chains.filter((chain) =>
        isChainSupported(chain.id)
      );

      // Cache chains
      supportedChains.forEach((chain) => {
        this.chainCache.set(chain.id, chain);
      });

      console.log(`🔗 Found ${supportedChains.length} supported chains`);
      return supportedChains;
    } catch (error) {
      console.error("❌ Failed to get supported chains:", error);
      throw error;
    }
  }

  /**
   * Get chain by ID
   */
  async getChainById(chainId: number): Promise<LiFiChain | null> {
    // Check cache first
    if (this.chainCache.has(chainId)) {
      return this.chainCache.get(chainId) || null;
    }

    // Fetch from service
    try {
      const chain = await lifiService.getChainById(chainId);
      if (chain && isChainSupported(chainId)) {
        this.chainCache.set(chainId, chain);
        return chain;
      }
      return null;
    } catch (error) {
      console.error(`❌ Failed to get chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get chain metadata
   */
  getChainMetadata(chainId: number): ChainMetadata | null {
    return this.chainMetadata.get(chainId) || null;
  }

  /**
   * Get chain configuration
   */
  getChainConfiguration(chainId: number) {
    const metadata = this.getChainMetadata(chainId);
    const config = getChainConfig(chainId);

    return {
      ...config,
      metadata,
      isSupported: isChainSupported(chainId),
    };
  }

  /**
   * Get tokens for a specific chain
   */
  async getChainTokens(chainId: number): Promise<LiFiToken[]> {
    const cacheKey = `tokens_${chainId}`;

    // Check cache first
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey) || [];
    }

    try {
      const tokens = await lifiService.getTokens(chainId);

      // Cache tokens
      this.tokenCache.set(cacheKey, tokens);

      console.log(`💰 Loaded ${tokens.length} tokens for chain ${chainId}`);
      return tokens;
    } catch (error) {
      console.error(`❌ Failed to get tokens for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Find token by symbol on a specific chain
   */
  async findTokenBySymbol(
    chainId: number,
    symbol: string
  ): Promise<LiFiToken | null> {
    const tokens = await this.getChainTokens(chainId);
    return (
      tokens.find(
        (token) => token.symbol.toLowerCase() === symbol.toLowerCase()
      ) || null
    );
  }

  /**
   * Find token by address on a specific chain
   */
  async findTokenByAddress(
    chainId: number,
    address: string
  ): Promise<LiFiToken | null> {
    const tokens = await this.getChainTokens(chainId);
    return (
      tokens.find(
        (token) => token.address.toLowerCase() === address.toLowerCase()
      ) || null
    );
  }

  /**
   * Get popular tokens for a chain
   */
  async getPopularTokens(
    chainId: number,
    limit: number = 10
  ): Promise<LiFiToken[]> {
    const tokens = await this.getChainTokens(chainId);

    // Sort by some popularity criteria (you can customize this)
    // For now, we'll prioritize tokens with higher precision and known symbols
    const popularSymbols = [
      "ETH",
      "USDC",
      "USDT",
      "DAI",
      "WETH",
      "MATIC",
      "BNB",
      "AVAX",
      "FTM",
      "MNT",
    ];

    const sortedTokens = tokens.sort((a, b) => {
      const aIndex = popularSymbols.indexOf(a.symbol);
      const bIndex = popularSymbols.indexOf(b.symbol);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // Secondary sort by decimals (higher precision tokens first)
      return b.decimals - a.decimals;
    });

    return sortedTokens.slice(0, limit);
  }

  /**
   * Get native token for a chain
   */
  async getNativeToken(chainId: number): Promise<LiFiToken | null> {
    const tokens = await this.getChainTokens(chainId);
    const metadata = this.getChainMetadata(chainId);

    if (!metadata) return null;

    // Find native token (usually has address '0x0000000000000000000000000000000000000000')
    return (
      tokens.find(
        (token) =>
          token.address === "0x0000000000000000000000000000000000000000" ||
          token.symbol === metadata.nativeCurrency
      ) || null
    );
  }

  /**
   * Check if a chain supports cross-chain transfers
   */
  async supportsCrossChain(
    fromChainId: number,
    toChainId: number
  ): Promise<boolean> {
    try {
      const tools = await lifiService.getTools();

      // Check if there are bridges that support this chain pair
      const supportedBridges =
        tools.bridges?.filter((bridge: any) => {
          const fromChains = bridge.fromChains || [];
          const toChains = bridge.toChains || [];

          return (
            fromChains.includes(fromChainId) && toChains.includes(toChainId)
          );
        }) || [];

      return supportedBridges.length > 0;
    } catch (error) {
      console.error(
        `❌ Failed to check cross-chain support for ${fromChainId} -> ${toChainId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get available bridges for a chain pair
   */
  async getAvailableBridges(
    fromChainId: number,
    toChainId: number
  ): Promise<any[]> {
    try {
      const tools = await lifiService.getTools();

      const availableBridges =
        tools.bridges?.filter((bridge: any) => {
          const fromChains = bridge.fromChains || [];
          const toChains = bridge.toChains || [];

          return (
            fromChains.includes(fromChainId) && toChains.includes(toChainId)
          );
        }) || [];

      console.log(
        `🌉 Found ${availableBridges.length} bridges for ${fromChainId} -> ${toChainId}`
      );
      return availableBridges;
    } catch (error) {
      console.error(
        `❌ Failed to get bridges for ${fromChainId} -> ${toChainId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get chain statistics
   */
  getChainStats() {
    return {
      totalChains: this.chainMetadata.size,
      supportedChains: lifiConfig.supportedChains.length,
      cachedChains: this.chainCache.size,
      cachedTokens: this.tokenCache.size,
      testnets: Array.from(this.chainMetadata.values()).filter(
        (m) => m.isTestnet
      ).length,
      mainnets: Array.from(this.chainMetadata.values()).filter(
        (m) => !m.isTestnet
      ).length,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.chainCache.clear();
    this.tokenCache.clear();
    console.log("🧹 Chain manager cache cleared");
  }

  /**
   * Validate chain ID
   */
  isValidChainId(chainId: number): boolean {
    return chainId > 0 && Number.isInteger(chainId);
  }

  /**
   * Get testnet chains
   */
  getTestnetChains(): ChainMetadata[] {
    return Array.from(this.chainMetadata.values()).filter(
      (metadata) => metadata.isTestnet
    );
  }

  /**
   * Get mainnet chains
   */
  getMainnetChains(): ChainMetadata[] {
    return Array.from(this.chainMetadata.values()).filter(
      (metadata) => !metadata.isTestnet
    );
  }
}

/**
 * Chain metadata interface
 */
export interface ChainMetadata {
  name: string;
  symbol: string;
  nativeCurrency: string;
  blockExplorer: string;
  rpcUrls: string[];
  isTestnet: boolean;
  avgBlockTime: number; // in seconds
  gasMultiplier: number;
}

// Export singleton instance
export const lifiChainManager = new LiFiChainManager();
export default lifiChainManager;
