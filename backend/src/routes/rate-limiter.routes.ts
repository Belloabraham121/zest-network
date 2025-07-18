import { Router } from 'express';
import { rateLimiterService } from '../services/rate-limiter.service';

const router = Router();

/**
 * GET /api/rate-limiter/status/:phoneNumber
 * Get rate limit status for a specific phone number
 */
router.get('/status/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const status = await rateLimiterService.getRateLimitStatus(phoneNumber);
    const canSend = await rateLimiterService.canSendMessage(phoneNumber);
    
    res.json({
      success: true,
      data: {
        phoneNumber,
        messageCount: status.messageCount,
        dailyLimit: status.dailyLimit,
        remaining: status.remaining,
        resetTime: status.resetTime,
        canSendMessage: canSend.allowed,
        reason: canSend.reason || null
      }
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/rate-limiter/stats
 * Get global rate limiting statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await rateLimiterService.getGlobalStats();
    
    res.json({
      success: true,
      data: {
        totalMessagesToday: stats.totalMessagesToday,
        activeUsers: stats.activeUsers,
        nearLimitUsers: stats.nearLimitUsers,
        timestamp: new Date().toISOString(),
        recommendations: {
          upgradeAccount: stats.totalMessagesToday > 6,
          monitorUsage: stats.nearLimitUsers > 0,
          implementCaching: stats.activeUsers > 5
        }
      }
    });
  } catch (error) {
    console.error('Error getting global stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/rate-limiter/check
 * Check if a phone number can send a message
 */
router.post('/check', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const result = await rateLimiterService.canSendMessage(phoneNumber);
    
    res.json({
      success: true,
      data: {
        phoneNumber,
        allowed: result.allowed,
        remaining: result.remaining,
        resetTime: result.resetTime,
        reason: result.reason || null
      }
    });
  } catch (error) {
    console.error('Error checking rate limit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/rate-limiter/reset
 * Reset rate limit for a phone number (for testing purposes)
 */
router.post('/reset', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    await rateLimiterService.resetCounter(phoneNumber);
    const status = await rateLimiterService.getRateLimitStatus(phoneNumber);
    
    res.json({
      success: true,
      message: `Rate limit reset for ${phoneNumber}`,
      data: {
        phoneNumber,
        messageCount: status.messageCount,
        dailyLimit: status.dailyLimit,
        remaining: status.remaining,
        resetTime: status.resetTime
      }
    });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/rate-limiter/reset-all
 * Reset rate limits for all users (admin function)
 */
router.post('/reset-all', async (req, res) => {
  try {
    const result = await rateLimiterService.resetAllCounters();
    
    res.json({
      success: true,
      message: 'All rate limits have been reset',
      data: {
        resetCount: result.resetCount,
        timestamp: new Date().toISOString(),
        newDailyLimit: result.newDailyLimit
      }
    });
  } catch (error) {
    console.error('Error resetting all rate limits:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;