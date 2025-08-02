import { lifiService, LiFiService } from "./lifi.service";
import { LiFiChainManager } from "./lifi-chain-manager.service";
import { LiFiTokenManager } from "./lifi-token-manager.service";
import { LiFiToolsProvider } from "./lifi-tools-provider.service";
import { executeWithRateLimit } from "./lifi-rate-limiter.service";
import { logger } from "../utils/logger";
import { isChainSupported } from "../config/lifi";

export interface QuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  allowBridges?: string[];
  denyBridges?: string[];
  allowExchanges?: string[];
  denyExchanges?: string[];
  preferredTools?: string[];
  integrator?: string;
}

export interface QuoteResponse {
  id: string;
  type: "lifi" | "cross-chain";
  tool: any;
  toolDetails: any;
  action: any;
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress?: string;
    executionDuration: number;
    feeCosts: Array<{
      name: string;
      description: string;
      percentage: string;
      token: any;
      amount: string;
      amountUSD: string;
      included: boolean;
    }>;
    gasCosts: Array<{
      type: string;
      price: string;
      estimate: string;
      limit: string;
      amount: string;
      amountUSD: string;
      token: any;
    }>;
  };
  includedSteps: any[];
  transactionRequest?: any;
  tags?: string[];
}

export interface RouteComparison {
  quotes: QuoteResponse[];
  bestQuote: QuoteResponse;
  comparison: {
    byOutput: QuoteResponse;
    bySpeed: QuoteResponse;
    byCost: QuoteResponse;
    byReliability: QuoteResponse;
  };
  metrics: {
    totalQuotes: number;
    averageOutput: string;
    averageTime: number;
    averageCost: string;
  };
}

export interface RouteValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  gasEstimate?: {
    estimated: string;
    limit: string;
    price: string;
  };
}

export interface SlippageConfig {
  default: number;
  minimum: number;
  maximum: number;
  auto: boolean;
  volatilityAdjustment: boolean;
}

class LiFiQuoteManagerService {
  private lifiService: LiFiService;
  private chainManager: LiFiChainManager;
  private tokenManager: LiFiTokenManager;
  private toolsProvider: LiFiToolsProvider;
  private quoteCache: Map<
    string,
    { quote: QuoteResponse; timestamp: number; ttl: number }
  > = new Map();
  private routeCache: Map<
    string,
    { routes: QuoteResponse[]; timestamp: number; ttl: number }
  > = new Map();
  private readonly DEFAULT_QUOTE_TTL = 30000; // 30 seconds
  private readonly DEFAULT_ROUTE_TTL = 60000; // 1 minute
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.lifiService = lifiService;
    this.chainManager = new LiFiChainManager();
    this.tokenManager = new LiFiTokenManager();
    this.toolsProvider = new LiFiToolsProvider();

    // Clean cache periodically
    setInterval(() => this.cleanExpiredCache(), 60000); // Every minute
  }

  /**
   * Get a quote for a token swap or cross-chain transfer
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedQuote(cacheKey);



      if (cached) {

        logger.info("Returning cached quote", { cacheKey });
        return cached;
      }

      // Validate request
      await this.validateQuoteRequest(request);

      // Apply slippage configuration
      const slippage = await this.calculateSlippage(request);
      const requestWithSlippage = { ...request, slippage };

      // Get quote from LI.FI


      const quote = await executeWithRateLimit(async () => {
        return await this.lifiService.getQuote(requestWithSlippage);
      });



      if (!quote) {
        throw new Error("Failed to get quote from LI.FI");
      }

      // Process and enhance quote
      const processedQuote = await this.processQuote(quote, request);



      // Cache the quote
      this.cacheQuote(cacheKey, processedQuote);

      logger.info("Quote generated successfully", {
        fromChain: request.fromChain,
        toChain: request.toChain,
        fromAmount: request.fromAmount,
        toAmount: processedQuote.estimate.toAmount,
      });

      return processedQuote;
    } catch (error) {
      logger.error("Failed to get quote", {
        error: error instanceof Error ? error.message : String(error),
        request,
      });
      throw error;
    }
  }

  /**
   * Get multiple quotes and compare them
   */
  async getQuoteComparison(
    request: QuoteRequest,
    options?: {
      includeAlternativeRoutes?: boolean;
      maxQuotes?: number;
      preferredTools?: string[];
    }
  ): Promise<RouteComparison> {
    try {
      const cacheKey = `comparison_${this.generateCacheKey(request)}`;
      const cached = this.getCachedRoutes(cacheKey);

      if (cached) {
        return this.buildRouteComparison(cached);
      }

      const quotes: QuoteResponse[] = [];
      const maxQuotes = options?.maxQuotes || 5;

      // Get primary quote
      const primaryQuote = await this.getQuote(request);
      quotes.push(primaryQuote);

      // Get alternative routes if requested
      if (options?.includeAlternativeRoutes && quotes.length < maxQuotes) {
        const alternativeQuotes = await this.getAlternativeRoutes(
          request,
          maxQuotes - 1
        );
        quotes.push(...alternativeQuotes);
      }

      // Cache routes
      this.cacheRoutes(cacheKey, quotes);

      return this.buildRouteComparison(quotes);
    } catch (error) {
      logger.error("Failed to get quote comparison", {
        error: error instanceof Error ? error.message : String(error),
        request,
      });
      throw error;
    }
  }

  /**
   * Validate a route before execution
   */
  async validateRoute(quote: QuoteResponse): Promise<RouteValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate quote structure
      if (!quote.estimate || !quote.estimate.toAmount) {
        errors.push("Invalid quote structure");
      }

      // Validate chains
      const fromChain = quote.action?.fromChainId;
      const toChain = quote.action?.toChainId;

      if (fromChain && !isChainSupported(fromChain)) {
        errors.push(`Source chain ${fromChain} is not supported`);
      }

      if (toChain && !isChainSupported(toChain)) {
        errors.push(`Destination chain ${toChain} is not supported`);
      }

      // Validate tokens
      if (quote.action?.fromToken && quote.action?.fromChainId) {
        const fromToken = await this.tokenManager.findTokenByAddress(
          quote.action.fromChainId,
          quote.action.fromToken.address
        );
        if (!fromToken) {
          warnings.push("Source token not found in token list");
        }
      }

      // Validate gas estimates
      let gasEstimate;
      if (quote.estimate.gasCosts && quote.estimate.gasCosts.length > 0) {
        const totalGas = quote.estimate.gasCosts.reduce((sum, cost) => {
          return sum + parseInt(cost.estimate || "0");
        }, 0);

        gasEstimate = {
          estimated: totalGas.toString(),
          limit: (totalGas * 1.2).toString(), // 20% buffer
          price: quote.estimate.gasCosts[0]?.price || "0",
        };
      }

      // Check for high slippage
      if (quote.estimate.toAmount && quote.estimate.toAmountMin) {
        const slippage =
          (parseFloat(quote.estimate.toAmount) -
            parseFloat(quote.estimate.toAmountMin)) /
          parseFloat(quote.estimate.toAmount);
        if (slippage > 0.05) {
          // 5%
          warnings.push(
            `High slippage detected: ${(slippage * 100).toFixed(2)}%`
          );
        }
      }

      // Check execution time
      if (quote.estimate.executionDuration > 600) {
        // 10 minutes
        warnings.push(
          `Long execution time: ${Math.round(
            quote.estimate.executionDuration / 60
          )} minutes`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        gasEstimate,
      };
    } catch (error) {
      logger.error("Failed to validate route", {
        error: error instanceof Error ? error.message : String(error),
        quote,
      });
      return {
        isValid: false,
        errors: ["Route validation failed"],
        warnings: [],
      };
    }
  }

  /**
   * Get slippage configuration
   */
  getSlippageConfig(): SlippageConfig {
    return {
      default: 0.005, // 0.5%
      minimum: 0.001, // 0.1%
      maximum: 0.05, // 5%
      auto: true,
      volatilityAdjustment: true,
    };
  }

  /**
   * Calculate optimal slippage for a request
   */
  private async calculateSlippage(request: QuoteRequest): Promise<number> {
    if (request.slippage) {
      return Math.max(0.001, Math.min(0.05, request.slippage));
    }

    const config = this.getSlippageConfig();

    if (!config.auto) {
      return config.default;
    }

    // Auto-calculate based on token volatility and market conditions
    let slippage = config.default;

    // Increase slippage for cross-chain transactions
    if (request.fromChain !== request.toChain) {
      slippage *= 1.5;
    }

    // Increase slippage for large amounts (simplified logic)
    const amount = parseFloat(request.fromAmount);
    if (amount > 10000) {
      slippage *= 1.2;
    }

    return Math.max(config.minimum, Math.min(config.maximum, slippage));
  }

  /**
   * Validate quote request
   */
  private async validateQuoteRequest(request: QuoteRequest): Promise<void> {
    if (!request.fromChain || !request.toChain) {
      throw new Error("Source and destination chains are required");
    }

    if (!request.fromToken || !request.toToken) {
      throw new Error("Source and destination tokens are required");
    }

    if (!request.fromAmount || parseFloat(request.fromAmount) <= 0) {
      throw new Error("Valid amount is required");
    }

    if (!request.fromAddress) {
      throw new Error("From address is required");
    }

    // Validate chain support
    if (!isChainSupported(request.fromChain)) {
      throw new Error(`Source chain ${request.fromChain} is not supported`);
    }

    if (!isChainSupported(request.toChain)) {
      throw new Error(`Destination chain ${request.toChain} is not supported`);
    }
  }

  /**
   * Process and enhance quote response
   */
  private async processQuote(
    quote: any,
    request: QuoteRequest
  ): Promise<QuoteResponse> {
    // Fix address mismatch by ensuring action addresses match request addresses
    const correctedAction = quote.action
      ? {
          ...quote.action,
          fromAddress: request.fromAddress, // Force the correct fromAddress
          toAddress: request.toAddress || request.fromAddress, // Force the correct toAddress
        }
      : quote.action;

    // Also fix addresses in all steps to prevent step-level address mismatches
    const correctedSteps = (quote.includedSteps || quote.steps || []).map(
      (step: any) => {
        if (step.action) {
          return {
            ...step,
            action: {
              ...step.action,
              fromAddress: request.fromAddress,
              toAddress: request.toAddress || request.fromAddress,
            },
          };
        }
        return step;
      }
    );



    // Preserve original quote structure while applying address corrections
    const processedQuote: QuoteResponse = {
      ...quote, // Preserve all original properties
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: request.fromChain === request.toChain ? "lifi" : "cross-chain",
      action: correctedAction,
      // Preserve both includedSteps and steps properties if they exist
      ...(quote.includedSteps && { includedSteps: correctedSteps }),
      ...(quote.steps && { steps: correctedSteps }),
      tags: this.generateQuoteTags(quote, request),
    };

    return processedQuote;
  }

  /**
   * Generate tags for quote categorization
   */
  private generateQuoteTags(quote: any, request: QuoteRequest): string[] {
    const tags: string[] = [];

    // Add type tags
    if (request.fromChain === request.toChain) {
      tags.push("same-chain", "swap");
    } else {
      tags.push("cross-chain", "bridge");
    }

    // Add tool tags
    if (quote.tool?.name) {
      tags.push(`tool:${quote.tool.name.toLowerCase()}`);
    }

    // Add performance tags
    if (quote.estimate?.executionDuration) {
      if (quote.estimate.executionDuration < 60) {
        tags.push("fast");
      } else if (quote.estimate.executionDuration > 300) {
        tags.push("slow");
      }
    }

    // Add cost tags
    if (quote.estimate?.gasCosts) {
      const totalGasCost = quote.estimate.gasCosts.reduce(
        (sum: number, cost: any) => {
          return sum + parseFloat(cost.amountUSD || "0");
        },
        0
      );

      if (totalGasCost < 1) {
        tags.push("low-cost");
      } else if (totalGasCost > 10) {
        tags.push("high-cost");
      }
    }

    return tags;
  }

  /**
   * Get alternative routes for comparison
   */
  private async getAlternativeRoutes(
    request: QuoteRequest,
    maxRoutes: number
  ): Promise<QuoteResponse[]> {
    const routes: QuoteResponse[] = [];

    try {
      // Get available tools for the route
      const tools = await this.toolsProvider.getRecommendedBridges(
        request.fromChain,
        request.toChain
      );

      // Try different tool combinations
      for (let i = 0; i < Math.min(tools.length, maxRoutes); i++) {
        try {
          const toolRequest = {
            ...request,
            allowBridges: [tools[i].name],
            denyBridges: undefined,
          };

          const quote = await executeWithRateLimit(async () => {
            return await this.lifiService.getQuote(toolRequest);
          });

          if (quote) {
            const processedQuote = await this.processQuote(quote, toolRequest);
            routes.push(processedQuote);
          }
        } catch (error) {
          logger.warn("Failed to get alternative route", {
            tool: tools[i].name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.warn("Failed to get alternative routes", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return routes;
  }

  /**
   * Build route comparison from quotes
   */
  private buildRouteComparison(quotes: QuoteResponse[]): RouteComparison {
    if (quotes.length === 0) {
      throw new Error("No quotes available for comparison");
    }

    // Find best quotes by different criteria
    const byOutput = quotes.reduce((best, current) =>
      parseFloat(current.estimate.toAmount) > parseFloat(best.estimate.toAmount)
        ? current
        : best
    );

    const bySpeed = quotes.reduce((best, current) =>
      current.estimate.executionDuration < best.estimate.executionDuration
        ? current
        : best
    );

    const byCost = quotes.reduce((best, current) => {
      const currentCost = current.estimate.gasCosts.reduce(
        (sum, cost) => sum + parseFloat(cost.amountUSD || "0"),
        0
      );
      const bestCost = best.estimate.gasCosts.reduce(
        (sum, cost) => sum + parseFloat(cost.amountUSD || "0"),
        0
      );
      return currentCost < bestCost ? current : best;
    });

    // For reliability, prefer tools with better performance scores
    const byReliability = quotes.reduce((best, current) => {
      const currentScore = this.getToolReliabilityScore(
        current.tool?.name || ""
      );
      const bestScore = this.getToolReliabilityScore(best.tool?.name || "");
      return currentScore > bestScore ? current : best;
    });

    // Calculate metrics
    const totalOutput = quotes.reduce(
      (sum, quote) => sum + parseFloat(quote.estimate.toAmount),
      0
    );
    const totalTime = quotes.reduce(
      (sum, quote) => sum + quote.estimate.executionDuration,
      0
    );
    const totalCost = quotes.reduce((sum, quote) => {
      return (
        sum +
        quote.estimate.gasCosts.reduce(
          (costSum, cost) => costSum + parseFloat(cost.amountUSD || "0"),
          0
        )
      );
    }, 0);

    return {
      quotes,
      bestQuote: byOutput, // Default to best output
      comparison: {
        byOutput,
        bySpeed,
        byCost,
        byReliability,
      },
      metrics: {
        totalQuotes: quotes.length,
        averageOutput: (totalOutput / quotes.length).toString(),
        averageTime: totalTime / quotes.length,
        averageCost: (totalCost / quotes.length).toString(),
      },
    };
  }

  /**
   * Generate cache key for quote request
   */
  private generateCacheKey(request: QuoteRequest): string {
    const key = `${request.fromChain}_${request.toChain}_${request.fromToken}_${
      request.toToken
    }_${request.fromAmount}_${request.fromAddress}_${
      request.slippage || "auto"
    }`;
    return Buffer.from(key).toString("base64").substr(0, 32);
  }

  /**
   * Cache a quote
   */
  private cacheQuote(key: string, quote: QuoteResponse, ttl?: number): void {
    if (this.quoteCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanExpiredCache();
    }

    this.quoteCache.set(key, {
      quote,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_QUOTE_TTL,
    });
  }

  /**
   * Get cached quote
   */
  private getCachedQuote(key: string): QuoteResponse | null {
    const cached = this.quoteCache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.quoteCache.delete(key);
      return null;
    }

    return cached.quote;
  }

  /**
   * Cache routes
   */
  private cacheRoutes(
    key: string,
    routes: QuoteResponse[],
    ttl?: number
  ): void {
    if (this.routeCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanExpiredCache();
    }

    this.routeCache.set(key, {
      routes,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_ROUTE_TTL,
    });
  }

  /**
   * Get cached routes
   */
  private getCachedRoutes(key: string): QuoteResponse[] | null {
    const cached = this.routeCache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.routeCache.delete(key);
      return null;
    }

    return cached.routes;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();

    // Clean quote cache
    for (const [key, cached] of this.quoteCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.quoteCache.delete(key);
      }
    }

    // Clean route cache
    for (const [key, cached] of this.routeCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.routeCache.delete(key);
      }
    }

    logger.debug("Cache cleaned", {
      quotesCached: this.quoteCache.size,
      routesCached: this.routeCache.size,
    });
  }

  /**
   * Get tool reliability score
   */
  private getToolReliabilityScore(toolName: string): number {
    const performance = this.toolsProvider.getProviderPerformance(toolName);
    if (!performance) {
      return 0.5; // Default score for unknown tools
    }

    // Calculate score based on success rate and speed (inverse of avg time)
    const successScore = performance.successRate;
    const speedScore =
      performance.avgTime > 0 ? Math.min(1, 60 / performance.avgTime) : 0.5;

    return successScore * 0.7 + speedScore * 0.3;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.quoteCache.clear();
    this.routeCache.clear();
    logger.info("All caches cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    quotes: { size: number; maxSize: number };
    routes: { size: number; maxSize: number };
  } {
    return {
      quotes: {
        size: this.quoteCache.size,
        maxSize: this.MAX_CACHE_SIZE,
      },
      routes: {
        size: this.routeCache.size,
        maxSize: this.MAX_CACHE_SIZE,
      },
    };
  }
}

export { LiFiQuoteManagerService };
export const lifiQuoteManager = new LiFiQuoteManagerService();
