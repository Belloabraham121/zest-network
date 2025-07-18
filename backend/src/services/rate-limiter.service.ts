import mongoose from "mongoose";

interface RateLimitData {
  phoneNumber: string;
  messageCount: number;
  lastReset: Date;
  dailyLimit: number;
}

export class RateLimiterService {
  private readonly COLLECTION_NAME = "rate_limits";
  private readonly DEFAULT_DAILY_LIMIT = 20; // Increased limit for better user experience
  private readonly RESET_HOUR = 0; // Reset at midnight UTC

  constructor() {
    // No need to initialize database service
  }

  /**
   * Check if a phone number can send a message without exceeding rate limits
   */
  async canSendMessage(phoneNumber: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    reason?: string;
  }> {
    try {
      const rateLimitData = await this.getRateLimitData(phoneNumber);
      const now = new Date();

      // Check if we need to reset the counter (new day)
      if (this.shouldResetCounter(rateLimitData.lastReset, now)) {
        await this.resetCounter(phoneNumber);
        return {
          allowed: true,
          remaining: this.DEFAULT_DAILY_LIMIT - 1,
          resetTime: this.getNextResetTime(now),
        };
      }

      // Check if limit exceeded
      if (rateLimitData.messageCount >= rateLimitData.dailyLimit) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: this.getNextResetTime(now),
          reason: `Daily limit of ${rateLimitData.dailyLimit} messages exceeded`,
        };
      }

      return {
        allowed: true,
        remaining: rateLimitData.dailyLimit - rateLimitData.messageCount - 1,
        resetTime: this.getNextResetTime(now),
      };
    } catch (error) {
      console.error("Rate limiter error:", error);
      // Fail open - allow the message if there's an error
      return {
        allowed: true,
        remaining: this.DEFAULT_DAILY_LIMIT,
        resetTime: this.getNextResetTime(new Date()),
      };
    }
  }

  /**
   * Record that a message was sent
   */
  async recordMessage(phoneNumber: string): Promise<void> {
    try {
      const collection = mongoose.connection.db?.collection(
        this.COLLECTION_NAME
      );
      if (!collection) {
        console.error("Database connection not available");
        return;
      }

      await collection.updateOne(
        { phoneNumber },
        {
          $inc: { messageCount: 1 },
          $setOnInsert: {
            phoneNumber,
            lastReset: new Date(),
            dailyLimit: this.DEFAULT_DAILY_LIMIT,
          },
        },
        { upsert: true }
      );

      console.log(`📊 Message recorded for ${phoneNumber}`);
    } catch (error) {
      console.error("Error recording message:", error);
    }
  }

  /**
   * Get current rate limit status for a phone number
   */
  async getRateLimitStatus(phoneNumber: string): Promise<{
    messageCount: number;
    dailyLimit: number;
    remaining: number;
    resetTime: Date;
  }> {
    const rateLimitData = await this.getRateLimitData(phoneNumber);
    const now = new Date();

    if (this.shouldResetCounter(rateLimitData.lastReset, now)) {
      return {
        messageCount: 0,
        dailyLimit: this.DEFAULT_DAILY_LIMIT,
        remaining: this.DEFAULT_DAILY_LIMIT,
        resetTime: this.getNextResetTime(now),
      };
    }

    return {
      messageCount: rateLimitData.messageCount,
      dailyLimit: rateLimitData.dailyLimit,
      remaining: Math.max(
        0,
        rateLimitData.dailyLimit - rateLimitData.messageCount
      ),
      resetTime: this.getNextResetTime(now),
    };
  }

  /**
   * Get global rate limit statistics
   */
  async getGlobalStats(): Promise<{
    totalMessagesToday: number;
    activeUsers: number;
    nearLimitUsers: number;
  }> {
    try {
      const collection = mongoose.connection.db?.collection(
        this.COLLECTION_NAME
      );
      if (!collection) {
        console.error("Database connection not available");
        return { totalMessagesToday: 0, activeUsers: 0, nearLimitUsers: 0 };
      }

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      const stats = await collection
        .aggregate([
          {
            $match: {
              lastReset: { $gte: todayStart },
            },
          },
          {
            $group: {
              _id: null,
              totalMessages: { $sum: "$messageCount" },
              activeUsers: { $sum: 1 },
              nearLimitUsers: {
                $sum: {
                  $cond: [
                    {
                      $gte: [
                        "$messageCount",
                        { $subtract: ["$dailyLimit", 2] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray();

      if (stats.length === 0) {
        return { totalMessagesToday: 0, activeUsers: 0, nearLimitUsers: 0 };
      }

      return {
        totalMessagesToday: stats[0].totalMessages,
        activeUsers: stats[0].activeUsers,
        nearLimitUsers: stats[0].nearLimitUsers,
      };
    } catch (error) {
      console.error("Error getting global stats:", error);
      return { totalMessagesToday: 0, activeUsers: 0, nearLimitUsers: 0 };
    }
  }

  private async getRateLimitData(phoneNumber: string): Promise<RateLimitData> {
    try {
      const collection = mongoose.connection.db?.collection(
        this.COLLECTION_NAME
      );
      if (!collection) {
        console.error("Database connection not available");
        return {
          phoneNumber,
          messageCount: 0,
          lastReset: new Date(),
          dailyLimit: this.DEFAULT_DAILY_LIMIT,
        };
      }

      const data = await collection.findOne({ phoneNumber });

      if (!data) {
        return {
          phoneNumber,
          messageCount: 0,
          lastReset: new Date(),
          dailyLimit: this.DEFAULT_DAILY_LIMIT,
        };
      }

      return {
        phoneNumber: data.phoneNumber,
        messageCount: data.messageCount || 0,
        lastReset: data.lastReset || new Date(),
        dailyLimit: data.dailyLimit || this.DEFAULT_DAILY_LIMIT,
      };
    } catch (error) {
      console.error("Error getting rate limit data:", error);
      return {
        phoneNumber,
        messageCount: 0,
        lastReset: new Date(),
        dailyLimit: this.DEFAULT_DAILY_LIMIT,
      };
    }
  }

  private shouldResetCounter(lastReset: Date, now: Date): boolean {
    const lastResetDate = new Date(
      lastReset.getFullYear(),
      lastReset.getMonth(),
      lastReset.getDate()
    );
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return nowDate > lastResetDate;
  }

  async resetCounter(phoneNumber: string): Promise<void> {
    try {
      const collection = mongoose.connection.db?.collection(
        this.COLLECTION_NAME
      );
      if (!collection) {
        console.error("Database connection not available");
        return;
      }

      await collection.updateOne(
        { phoneNumber },
        {
          $set: {
            messageCount: 0,
            lastReset: new Date(),
            dailyLimit: this.DEFAULT_DAILY_LIMIT, // Update to current default limit
          },
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error resetting counter:", error);
    }
  }

  /**
   * Reset rate limits for all users
   */
  async resetAllCounters(): Promise<{
    resetCount: number;
    newDailyLimit: number;
  }> {
    try {
      const collection = mongoose.connection.db?.collection(
        this.COLLECTION_NAME
      );
      if (!collection) {
        console.error("Database connection not available");
        return { resetCount: 0, newDailyLimit: this.DEFAULT_DAILY_LIMIT };
      }

      // Reset all existing records
      const result = await collection.updateMany(
        {}, // Empty filter to match all documents
        {
          $set: {
            messageCount: 0,
            lastReset: new Date(),
            dailyLimit: this.DEFAULT_DAILY_LIMIT, // Update all to current default limit
          },
        }
      );

      console.log(`📊 Reset rate limits for ${result.modifiedCount} users`);
      
      return {
        resetCount: result.modifiedCount,
        newDailyLimit: this.DEFAULT_DAILY_LIMIT
      };
    } catch (error) {
      console.error("Error resetting all counters:", error);
      throw error;
    }
  }

  private getNextResetTime(now: Date): Date {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.RESET_HOUR, 0, 0, 0);
    return tomorrow;
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService();
