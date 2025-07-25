import { lifiConfig } from "../config/lifi";

/**
 * Rate Limiter for LI.FI API calls
 * Implements token bucket algorithm to prevent API rate limit violations
 */
export class LiFiRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly minInterval: number; // minimum time between requests (ms)
  private lastRequestTime: number;

  constructor(
    maxTokens: number = 10, // max 10 concurrent requests
    refillRate: number = 2, // 2 tokens per second
    minInterval: number = 100 // minimum 100ms between requests
  ) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.minInterval = minInterval;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.lastRequestTime = 0;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // convert to seconds
    const tokensToAdd = Math.floor(timePassed * this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    this.refillTokens();

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Check minimum interval
    if (timeSinceLastRequest < this.minInterval) {
      return false;
    }

    // Check if we have tokens available
    return this.tokens > 0;
  }

  /**
   * Consume a token for making a request
   */
  consumeToken(): boolean {
    if (this.canMakeRequest()) {
      this.tokens--;
      this.lastRequestTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get time until next request can be made (in milliseconds)
   */
  getTimeUntilNextRequest(): number {
    this.refillTokens();

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minIntervalRemaining = Math.max(
      0,
      this.minInterval - timeSinceLastRequest
    );

    if (this.tokens > 0) {
      return minIntervalRemaining;
    }

    // Calculate time until next token is available
    const timeUntilNextToken = (1 / this.refillRate) * 1000; // convert to milliseconds
    return Math.max(minIntervalRemaining, timeUntilNextToken);
  }

  /**
   * Wait until a request can be made
   */
  async waitForAvailability(): Promise<void> {
    const waitTime = this.getTimeUntilNextRequest();
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Get current rate limiter status
   */
  getStatus() {
    this.refillTokens();
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      timeUntilNextRequest: this.getTimeUntilNextRequest(),
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.lastRequestTime = 0;
  }
}

/**
 * Global LI.FI rate limiter instance
 */
export const lifiRateLimiter = new LiFiRateLimiter(
  50, // max 50 concurrent requests
  5, // 5 requests per second
  200 // minimum 200ms between requests
);

/**
 * Decorator for LI.FI API calls (rate limiting disabled)
 */
export function rateLimited() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Rate limiting disabled - execute directly
      try {
        return await method.apply(this, args);
      } catch (error) {
        // Log rate limit errors specifically
        if (error instanceof Error && error.message.includes("rate limit")) {
          console.warn("❌ LI.FI API rate limit hit:", error.message);
        }
        throw error;
      }
    };
  };
}

/**
 * Utility function to execute LI.FI API calls without internal rate limiting
 */
export async function executeWithRateLimit<T>(
  apiCall: () => Promise<T>,
  retries: number = lifiConfig.maxRetries
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Bypass internal rate limiting - let LI.FI API handle its own limits
      return await apiCall();
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (error instanceof Error) {
        // Handle rate limit errors
        if (
          error.message.includes("rate limit") ||
          error.message.includes("429")
        ) {
          console.warn(
            `❌ LI.FI API rate limit exceeded (attempt ${attempt + 1}/${
              retries + 1
            }):`,
            error.message
          );

          // Extract retry-after from error if available
          let retryAfter = 3600; // Default to 1 hour as mentioned in error
          if (
            (error as any).cause &&
            (error as any).cause.response &&
            (error as any).cause.response.headers
          ) {
            const retryAfterHeader = (error as any).cause.response.headers.get(
              "retry-after"
            );
            if (retryAfterHeader) {
              retryAfter = parseInt(retryAfterHeader, 10);
            }
          }

          if (!isLastAttempt) {
            console.log(
              `⏳ LI.FI API rate limit hit. Waiting ${retryAfter} seconds before retry...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000)
            );
            continue;
          } else {
            // On final attempt, throw a user-friendly error
            throw new Error(
              `LI.FI API rate limit exceeded. Please try again in ${Math.ceil(
                retryAfter / 60
              )} minutes.`
            );
          }
        }

        // Handle network errors
        if (
          error.message.includes("network") ||
          error.message.includes("timeout")
        ) {
          console.warn(
            `LI.FI API network error (attempt ${attempt + 1}/${retries + 1}):`,
            error.message
          );

          if (!isLastAttempt) {
            await new Promise((resolve) =>
              setTimeout(resolve, lifiConfig.retryDelay)
            );
            continue;
          }
        }
      }

      // If it's the last attempt or an unrecoverable error, throw
      if (isLastAttempt) {
        throw error;
      }
    }
  }

  throw new Error("Max retries exceeded for LI.FI API call");
}
