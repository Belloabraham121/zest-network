import { lifiRateLimiter } from './lifi-rate-limiter.service';
import { lifiService } from './lifi.service';
import { lifiTokenManager } from './lifi-token-manager.service';
import { lifiChainManager } from './lifi-chain-manager.service';

/**
 * LI.FI Monitoring Service
 * Tracks API usage, cache performance, and rate limiting status
 */
export class LiFiMonitoringService {
  private apiCallCount: number = 0;
  private rateLimitHits: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private startTime: number = Date.now();

  constructor() {
    // Start periodic monitoring
    this.startPeriodicMonitoring();
  }

  /**
   * Record an API call
   */
  recordApiCall(): void {
    this.apiCallCount++;
  }

  /**
   * Record a rate limit hit
   */
  recordRateLimitHit(): void {
    this.rateLimitHits++;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Get comprehensive monitoring stats
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    const apiCallsPerHour = uptimeHours > 0 ? this.apiCallCount / uptimeHours : 0;
    const cacheHitRate = this.cacheHits + this.cacheMisses > 0 
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 
      : 0;

    return {
      uptime: {
        milliseconds: uptime,
        hours: uptimeHours.toFixed(2),
        startTime: new Date(this.startTime).toISOString()
      },
      apiUsage: {
        totalCalls: this.apiCallCount,
        callsPerHour: apiCallsPerHour.toFixed(2),
        rateLimitHits: this.rateLimitHits,
        rateLimitHitRate: this.apiCallCount > 0 ? ((this.rateLimitHits / this.apiCallCount) * 100).toFixed(2) + '%' : '0%'
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: cacheHitRate.toFixed(2) + '%'
      },
      rateLimiter: lifiRateLimiter.getStatus(),
      services: {
        lifiService: lifiService.getHealthStatus(),
        tokenManager: (lifiTokenManager as any).getTokenStats?.() || 'Not available',
        chainManager: 'Active'
      }
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];

    // Rate limit recommendations
    if (this.rateLimitHits > 0) {
      recommendations.push('🚨 Rate limit hits detected. Consider increasing cache TTL or reducing API call frequency.');
    }

    // Cache performance recommendations
    const cacheHitRate = parseFloat(stats.cache.hitRate.replace('%', ''));
    if (cacheHitRate < 70) {
      recommendations.push('📈 Cache hit rate is low. Consider preloading more data or increasing cache TTL.');
    }

    // API usage recommendations
    const callsPerHour = parseFloat(stats.apiUsage.callsPerHour);
    if (callsPerHour > 100) {
      recommendations.push('⚡ High API usage detected. Consider implementing more aggressive caching.');
    }

    // Rate limiter recommendations
    if (stats.rateLimiter.availableTokens < 10) {
      recommendations.push('🔄 Rate limiter tokens are low. Consider reducing request frequency.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is performing optimally!');
    }

    return recommendations;
  }

  /**
   * Start periodic monitoring and logging
   */
  private startPeriodicMonitoring(): void {
    // Log stats every 10 minutes
    setInterval(() => {
      const stats = this.getStats();
      console.log('📊 LI.FI Performance Stats:', {
        apiCalls: stats.apiUsage.totalCalls,
        rateLimitHits: stats.apiUsage.rateLimitHits,
        cacheHitRate: stats.cache.hitRate,
        uptime: stats.uptime.hours + 'h'
      });

      // Log recommendations if any issues
      const recommendations = this.getOptimizationRecommendations();
      if (recommendations.length > 1 || !recommendations[0].includes('optimally')) {
        console.log('💡 Optimization Recommendations:', recommendations);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.apiCallCount = 0;
    this.rateLimitHits = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.startTime = Date.now();
    console.log('📊 LI.FI monitoring stats reset');
  }

  /**
   * Export stats for external monitoring
   */
  exportStats(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }
}

// Export singleton instance
export const lifiMonitoring = new LiFiMonitoringService();
export default lifiMonitoring;