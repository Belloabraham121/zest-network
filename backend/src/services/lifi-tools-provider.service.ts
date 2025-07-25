import { lifiService } from "./lifi.service";
import { lifiConfig } from "../config/lifi";

/**
 * Tools and Providers Service for LI.FI
 * Handles bridge and exchange management, provider selection, and performance tracking
 */
export class LiFiToolsProvider {
  private toolsCache: LiFiTools | null = null;
  private providerPerformance: Map<string, ProviderPerformance> = new Map();
  private bridgePreferences: Map<string, number> = new Map();
  private exchangePreferences: Map<string, number> = new Map();
  private lastToolsUpdate: number = 0;

  constructor() {
    this.initializeProviderPreferences();
  }

  /**
   * Initialize provider preferences based on reliability and cost
   */
  private initializeProviderPreferences(): void {
    // Bridge preferences (higher score = more preferred)
    const bridgePrefs: Record<string, number> = {
      hop: 95,
      across: 90,
      stargate: 85,
      cbridge: 80,
      multichain: 75,
      synapse: 70,
      connext: 65,
      hyphen: 60,
      polygon: 85,
      arbitrum: 90,
      optimism: 88,
    };

    // Exchange preferences (higher score = more preferred)
    const exchangePrefs: Record<string, number> = {
      uniswap: 95,
      sushiswap: 90,
      pancakeswap: 85,
      quickswap: 80,
      spookyswap: 75,
      traderjoe: 85,
      curve: 88,
      balancer: 82,
      "1inch": 92,
      paraswap: 88,
      "0x": 85,
    };

    Object.entries(bridgePrefs).forEach(([bridge, score]) => {
      this.bridgePreferences.set(bridge.toLowerCase(), score);
    });

    Object.entries(exchangePrefs).forEach(([exchange, score]) => {
      this.exchangePreferences.set(exchange.toLowerCase(), score);
    });

    console.log(
      `🔧 Initialized preferences for ${this.bridgePreferences.size} bridges and ${this.exchangePreferences.size} exchanges`
    );
  }

  /**
   * Get all available tools (bridges and exchanges)
   */
  async getTools(): Promise<LiFiTools> {
    // Check cache freshness
    const cacheAge = Date.now() - this.lastToolsUpdate;
    if (this.toolsCache && cacheAge < lifiConfig.cacheTtl * 1000) {
      return this.toolsCache;
    }

    try {
      const tools = await lifiService.getTools();

      this.toolsCache = {
        bridges: tools.bridges || [],
        exchanges: tools.exchanges || [],
      };

      this.lastToolsUpdate = Date.now();

      console.log(
        `🔧 Loaded ${this.toolsCache.bridges.length} bridges and ${this.toolsCache.exchanges.length} exchanges`
      );
      return this.toolsCache;
    } catch (error) {
      console.error("❌ Failed to load tools:", error);
      throw error;
    }
  }

  /**
   * Get available bridges
   */
  async getBridges(): Promise<Bridge[]> {
    const tools = await this.getTools();
    return tools.bridges;
  }

  /**
   * Get available exchanges
   */
  async getExchanges(): Promise<Exchange[]> {
    const tools = await this.getTools();
    return tools.exchanges;
  }

  /**
   * Get bridges that support a specific chain pair
   */
  async getBridgesForChainPair(
    fromChainId: number,
    toChainId: number
  ): Promise<Bridge[]> {
    const bridges = await this.getBridges();

    return bridges.filter((bridge) => {
      const fromChains = bridge.fromChains || [];
      const toChains = bridge.toChains || [];

      return fromChains.includes(fromChainId) && toChains.includes(toChainId);
    });
  }

  /**
   * Get exchanges that support a specific chain
   */
  async getExchangesForChain(chainId: number): Promise<Exchange[]> {
    const exchanges = await this.getExchanges();

    return exchanges.filter((exchange) => {
      const supportedChains = exchange.supportedChains || [];
      return supportedChains.includes(chainId);
    });
  }

  /**
   * Get recommended bridges for a chain pair
   */
  async getRecommendedBridges(
    fromChainId: number,
    toChainId: number,
    limit: number = 3
  ): Promise<Bridge[]> {
    const availableBridges = await this.getBridgesForChainPair(
      fromChainId,
      toChainId
    );

    // Sort by preference score and performance
    const sortedBridges = availableBridges.sort((a, b) => {
      const aScore = this.getBridgeScore(a);
      const bScore = this.getBridgeScore(b);
      return bScore - aScore;
    });

    return sortedBridges.slice(0, limit);
  }

  /**
   * Get recommended exchanges for a chain
   */
  async getRecommendedExchanges(
    chainId: number,
    limit: number = 3
  ): Promise<Exchange[]> {
    const availableExchanges = await this.getExchangesForChain(chainId);

    // Sort by preference score and performance
    const sortedExchanges = availableExchanges.sort((a, b) => {
      const aScore = this.getExchangeScore(a);
      const bScore = this.getExchangeScore(b);
      return bScore - aScore;
    });

    return sortedExchanges.slice(0, limit);
  }

  /**
   * Calculate bridge score based on preferences and performance
   */
  private getBridgeScore(bridge: Bridge): number {
    const baseScore =
      this.bridgePreferences.get(bridge.key.toLowerCase()) || 50;
    const performance = this.providerPerformance.get(bridge.key) || {
      successRate: 0.9,
      avgTime: 300,
      avgCost: 0.01,
      totalTransactions: 0,
    };

    // Calculate performance multiplier
    const successMultiplier = performance.successRate;
    const timeMultiplier = Math.max(0.5, 1 - (performance.avgTime - 60) / 600); // Prefer faster bridges
    const costMultiplier = Math.max(0.5, 1 - performance.avgCost / 0.1); // Prefer cheaper bridges

    return baseScore * successMultiplier * timeMultiplier * costMultiplier;
  }

  /**
   * Calculate exchange score based on preferences and performance
   */
  private getExchangeScore(exchange: Exchange): number {
    const baseScore =
      this.exchangePreferences.get(exchange.key.toLowerCase()) || 50;
    const performance = this.providerPerformance.get(exchange.key) || {
      successRate: 0.95,
      avgTime: 30,
      avgCost: 0.003,
      totalTransactions: 0,
    };

    // Calculate performance multiplier
    const successMultiplier = performance.successRate;
    const timeMultiplier = Math.max(0.5, 1 - (performance.avgTime - 10) / 60); // Prefer faster exchanges
    const costMultiplier = Math.max(0.5, 1 - performance.avgCost / 0.01); // Prefer cheaper exchanges

    return baseScore * successMultiplier * timeMultiplier * costMultiplier;
  }

  /**
   * Record transaction performance for a provider
   */
  recordProviderPerformance(
    providerKey: string,
    success: boolean,
    executionTime: number,
    cost: number
  ): void {
    const existing = this.providerPerformance.get(providerKey) || {
      successRate: 0,
      avgTime: 0,
      avgCost: 0,
      totalTransactions: 0,
    };

    const totalTx = existing.totalTransactions + 1;
    const successCount =
      existing.successRate * existing.totalTransactions + (success ? 1 : 0);

    const updated: ProviderPerformance = {
      successRate: successCount / totalTx,
      avgTime:
        (existing.avgTime * existing.totalTransactions + executionTime) /
        totalTx,
      avgCost: (existing.avgCost * existing.totalTransactions + cost) / totalTx,
      totalTransactions: totalTx,
    };

    this.providerPerformance.set(providerKey, updated);

    console.log(
      `📊 Updated performance for ${providerKey}: ${(
        updated.successRate * 100
      ).toFixed(1)}% success, ${updated.avgTime.toFixed(1)}s avg time`
    );
  }

  /**
   * Get provider performance statistics
   */
  getProviderPerformance(providerKey: string): ProviderPerformance | null {
    return this.providerPerformance.get(providerKey) || null;
  }

  /**
   * Get all provider performance statistics
   */
  getAllProviderPerformance(): Map<string, ProviderPerformance> {
    return new Map(this.providerPerformance);
  }

  /**
   * Filter tools by criteria
   */
  async filterTools(criteria: ToolFilterCriteria): Promise<LiFiTools> {
    const tools = await this.getTools();

    let filteredBridges = tools.bridges;
    let filteredExchanges = tools.exchanges;

    // Filter bridges
    if (criteria.fromChainId && criteria.toChainId) {
      filteredBridges = filteredBridges.filter((bridge) => {
        const fromChains = bridge.fromChains || [];
        const toChains = bridge.toChains || [];
        return (
          fromChains.includes(criteria.fromChainId!) &&
          toChains.includes(criteria.toChainId!)
        );
      });
    }

    if (criteria.allowedBridges && criteria.allowedBridges.length > 0) {
      filteredBridges = filteredBridges.filter((bridge) =>
        criteria.allowedBridges!.includes(bridge.key)
      );
    }

    if (criteria.deniedBridges && criteria.deniedBridges.length > 0) {
      filteredBridges = filteredBridges.filter(
        (bridge) => !criteria.deniedBridges!.includes(bridge.key)
      );
    }

    // Filter exchanges
    if (criteria.chainId) {
      filteredExchanges = filteredExchanges.filter((exchange) => {
        const supportedChains = exchange.supportedChains || [];
        return supportedChains.includes(criteria.chainId!);
      });
    }

    if (criteria.allowedExchanges && criteria.allowedExchanges.length > 0) {
      filteredExchanges = filteredExchanges.filter((exchange) =>
        criteria.allowedExchanges!.includes(exchange.key)
      );
    }

    if (criteria.deniedExchanges && criteria.deniedExchanges.length > 0) {
      filteredExchanges = filteredExchanges.filter(
        (exchange) => !criteria.deniedExchanges!.includes(exchange.key)
      );
    }

    // Filter by minimum success rate
    if (criteria.minSuccessRate) {
      filteredBridges = filteredBridges.filter((bridge) => {
        const performance = this.getProviderPerformance(bridge.key);
        return (
          !performance || performance.successRate >= criteria.minSuccessRate!
        );
      });

      filteredExchanges = filteredExchanges.filter((exchange) => {
        const performance = this.getProviderPerformance(exchange.key);
        return (
          !performance || performance.successRate >= criteria.minSuccessRate!
        );
      });
    }

    return {
      bridges: filteredBridges,
      exchanges: filteredExchanges,
    };
  }

  /**
   * Get tool statistics
   */
  getToolStats() {
    return {
      bridgePreferences: this.bridgePreferences.size,
      exchangePreferences: this.exchangePreferences.size,
      trackedProviders: this.providerPerformance.size,
      lastUpdate: this.lastToolsUpdate,
      cacheAge: Date.now() - this.lastToolsUpdate,
    };
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.toolsCache = null;
    this.lastToolsUpdate = 0;
    console.log("🧹 Tools provider cache cleared");
  }

  /**
   * Reset provider performance data
   */
  resetProviderPerformance(): void {
    this.providerPerformance.clear();
    console.log("📊 Provider performance data reset");
  }

  /**
   * Get health status of tools and providers
   */
  getHealthStatus() {
    const tools = this.toolsCache;
    const performanceData = Array.from(this.providerPerformance.values());

    const avgSuccessRate =
      performanceData.length > 0
        ? performanceData.reduce((sum, p) => sum + p.successRate, 0) /
          performanceData.length
        : 0;

    const avgTime =
      performanceData.length > 0
        ? performanceData.reduce((sum, p) => sum + p.avgTime, 0) /
          performanceData.length
        : 0;

    return {
      toolsLoaded: tools !== null,
      bridgeCount: tools?.bridges.length || 0,
      exchangeCount: tools?.exchanges.length || 0,
      trackedProviders: this.providerPerformance.size,
      avgSuccessRate: avgSuccessRate,
      avgExecutionTime: avgTime,
      lastUpdate: this.lastToolsUpdate,
      cacheAge: Date.now() - this.lastToolsUpdate,
    };
  }
}

/**
 * LI.FI Tools interface
 */
export interface LiFiTools {
  bridges: Bridge[];
  exchanges: Exchange[];
}

/**
 * Bridge interface
 */
export interface Bridge {
  key: string;
  name: string;
  logoURI?: string;
  fromChains: number[];
  toChains: number[];
  supportedTokens?: string[];
}

/**
 * Exchange interface
 */
export interface Exchange {
  key: string;
  name: string;
  logoURI?: string;
  supportedChains: number[];
  supportedTokens?: string[];
}

/**
 * Provider performance tracking
 */
export interface ProviderPerformance {
  successRate: number; // 0-1
  avgTime: number; // seconds
  avgCost: number; // in ETH equivalent
  totalTransactions: number;
}

/**
 * Tool filter criteria
 */
export interface ToolFilterCriteria {
  fromChainId?: number;
  toChainId?: number;
  chainId?: number;
  allowedBridges?: string[];
  deniedBridges?: string[];
  allowedExchanges?: string[];
  deniedExchanges?: string[];
  minSuccessRate?: number;
}

// Export singleton instance
export const lifiToolsProvider = new LiFiToolsProvider();
export default lifiToolsProvider;
