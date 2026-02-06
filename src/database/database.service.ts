import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Language } from '../common/translations';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // User operations
  async createUser(userId: bigint, lang: Language) {
    try {
      // Get current total subscribers for signup position
      const currentCount = await this.users.count();
      const signupPosition = currentCount + 1;

      return await this.users.create({
        data: {
          user_id: userId,
          lang: lang,
          join_date: new Date(),
          status: 'Free',
          signup_position: signupPosition,
          news_feed_enabled: true,
          priority_filter: 'green'  // Default: все новости
        }
      });
    } catch (error) {
      this.logger.error(`Error creating user ${userId}:`, error);
      throw error;
    }
  }

  async getUser(userId: bigint) {
    try {
      return await this.users.findUnique({
        where: { user_id: userId }
      });
    } catch (error) {
      this.logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  async updateUserLanguage(userId: bigint, lang: Language) {
    try {
      return await this.users.update({
        where: { user_id: userId },
        data: { lang }
      });
    } catch (error) {
      this.logger.error(`Error updating user ${userId} language:`, error);
      throw error;
    }
  }

  async toggleNewsFeed(userId: bigint): Promise<boolean> {
    try {
      const user = await this.users.findUnique({
        where: { user_id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newStatus = !user.news_feed_enabled;
      await this.users.update({
        where: { user_id: userId },
        data: { news_feed_enabled: newStatus }
      });

      this.logger.log(`User ${userId} news feed toggled to ${newStatus}`);
      return newStatus;
    } catch (error) {
      this.logger.error(`Error toggling news feed for user ${userId}:`, error);
      throw error;
    }
  }

  async isNewsFeedEnabled(userId: bigint): Promise<boolean> {
    try {
      const user = await this.users.findUnique({
        where: { user_id: userId },
        select: { news_feed_enabled: true }
      });
      return user?.news_feed_enabled || false;
    } catch (error) {
      this.logger.error(`Error checking news feed status for user ${userId}:`, error);
      return false;
    }
  }

  async getAllUsers() {
    try {
      return await this.users.findMany();
    } catch (error) {
      this.logger.error('Error getting all users:', error);
      return [];
    }
  }

  async getUsersWithNewsFeedEnabled() {
    try {
      return await this.users.findMany({
        where: { news_feed_enabled: true }
      });
    } catch (error) {
      this.logger.error('Error getting users with news feed enabled:', error);
      return [];
    }
  }

  // News deduplication
  async isNewsSent(newsHash: string): Promise<boolean> {
    try {
      const news = await this.sent_news.findUnique({
        where: { news_hash: newsHash }
      });
      return !!news;
    } catch (error) {
      this.logger.error(`Error checking news hash ${newsHash}:`, error);
      return false;
    }
  }

  async markNewsSent(newsHash: string) {
    try {
      return await this.sent_news.create({
        data: {
          news_hash: newsHash,
          sent_at: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Error marking news as sent ${newsHash}:`, error);
      throw error;
    }
  }

  async getLatestNews(limit: number = 3) {
    try {
      return await this.sent_news.findMany({
        orderBy: { sent_at: 'desc' },
        take: limit
      });
    } catch (error) {
      this.logger.error('Error getting latest news:', error);
      return [];
    }
  }

  // User news tracking
  async hasUserSeenNews(userId: bigint, newsHash: string): Promise<boolean> {
    try {
      const record = await this.user_news.findUnique({
        where: {
          user_id_news_hash: {
            user_id: userId,
            news_hash: newsHash
          }
        }
      });
      return !!record;
    } catch (error) {
      this.logger.error(`Error checking if user ${userId} saw news ${newsHash}:`, error);
      return false;
    }
  }

  async markNewsSeenByUser(userId: bigint, newsHash: string) {
    try {
      return await this.user_news.create({
        data: {
          user_id: userId,
          news_hash: newsHash,
          sent_at: new Date()
        }
      });
    } catch (error) {
      // Ignore duplicate key errors (user already saw this news)
      if (error.code !== 'P2002') {
        this.logger.error(`Error marking news as seen by user ${userId}:`, error);
      }
    }
  }

  async getUserNewsHashes(userId: bigint, limit: number = 10): Promise<string[]> {
    try {
      const records = await this.user_news.findMany({
        where: { user_id: userId },
        orderBy: { sent_at: 'desc' },
        take: limit,
        select: { news_hash: true }
      });
      return records.map(r => r.news_hash);
    } catch (error) {
      this.logger.error(`Error getting user news hashes for ${userId}:`, error);
      return [];
    }
  }

  // Priority operations
  async saveNewsPriority(newsHash: string, priority: string, reason: string) {
    try {
      await this.news_priority.upsert({
        where: { news_hash: newsHash },
        update: { priority, priority_reason: reason },
        create: { news_hash: newsHash, priority, priority_reason: reason }
      });
    } catch (error) {
      this.logger.error(`Error saving priority for ${newsHash}:`, error);
    }
  }

  async getNewsPriority(newsHash: string): Promise<{ priority: string; reason: string } | null> {
    try {
      const record = await this.news_priority.findUnique({
        where: { news_hash: newsHash }
      });
      return record ? { priority: record.priority, reason: record.priority_reason || '' } : null;
    } catch (error) {
      this.logger.error(`Error getting priority for ${newsHash}:`, error);
      return null;
    }
  }

  async getPriorityFilter(userId: bigint): Promise<string> {
    try {
      const user = await this.users.findUnique({
        where: { user_id: userId },
        select: { priority_filter: true }
      });
      return user?.priority_filter || 'yellow';
    } catch (error) {
      this.logger.error(`Error getting priority filter for ${userId}:`, error);
      return 'yellow';
    }
  }

  async setPriorityFilter(userId: bigint, filter: string) {
    try {
      await this.users.update({
        where: { user_id: userId },
        data: { priority_filter: filter }
      });
      this.logger.log(`User ${userId} priority filter set to ${filter}`);
    } catch (error) {
      this.logger.error(`Error setting priority filter for ${userId}:`, error);
      throw error;
    }
  }

  async incrementNewsReadCount(userId: bigint) {
    try {
      await this.users.update({
        where: { user_id: userId },
        data: { news_read_count: { increment: 1 } }
      });
    } catch (error) {
      this.logger.error(`Error incrementing news read count for ${userId}:`, error);
    }
  }

  async setOnboardingDone(userId: bigint) {
    try {
      await this.users.update({
        where: { user_id: userId },
        data: { onboarding_done: true }
      });
    } catch (error) {
      this.logger.error(`Error setting onboarding done for ${userId}:`, error);
    }
  }

  // Token-related operations
  async getTotalSubscribers(): Promise<number> {
    try {
      return await this.users.count();
    } catch (error) {
      this.logger.error('Error getting total subscribers:', error);
      return 0;
    }
  }

  async getSignupPosition(userId: bigint): Promise<number | null> {
    try {
      const user = await this.users.findUnique({
        where: { user_id: userId },
        select: { signup_position: true }
      });
      return user?.signup_position || null;
    } catch (error) {
      this.logger.error(`Error getting signup position for ${userId}:`, error);
      return null;
    }
  }

  async setSignupPosition(userId: bigint, position: number) {
    try {
      await this.users.update({
        where: { user_id: userId },
        data: { signup_position: position }
      });
    } catch (error) {
      this.logger.error(`Error setting signup position for ${userId}:`, error);
    }
  }

  async calculatePendingAirdrop(position: number | null): Promise<number> {
    if (!position) return 0;
    
    // 30% of 1B = 300M tokens for airdrop
    // Assuming first 10k users get tokens
    const TOTAL_AIRDROP = 300_000_000;
    const MAX_USERS = 10_000;
    
    if (position > MAX_USERS) return 0;
    
    // Simple equal distribution for now
    return TOTAL_AIRDROP / MAX_USERS;
  }
}
