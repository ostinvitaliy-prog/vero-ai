import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService, NewsItem } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';
import * as crypto from 'crypto-js';

@Injectable()
export class CronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronService.name);
  private isScanning = false;

  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly db: DatabaseService,
    private readonly telegramService: TelegramService,
  ) {
    this.logger.log('✅ CronService initialized');
  }

  async onApplicationBootstrap() {
    this.logger.log('🚀 onApplicationBootstrap: initial scan & maybe post one...');
    await this.scanAndPostOne();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyScan() {
    this.logger.log('⏰ Hourly cron triggered');
    await this.scanAndPostOne();
  }

  async scanAndPostOne() {
    if (this.isScanning) {
      this.logger.warn('⚠️ Scan already in progress, skipping...');
      return;
    }

    this.isScanning = true;

    try {
      this.logger.log('🔍 Starting news scan (for one top news)...');

      const items: NewsItem[] = await this.rssService.fetchAllNews();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      if (!items.length) {
        this.logger.log('📭 No items from RSS.');
        return;
      }

      const sentHashes = await this.db.getAllNewsHashes();
      this.logger.log(`📊 Already sent news count: ${sentHashes.length}`);

      const candidates: {
        item: NewsItem;
        priority: 'RED' | 'YELLOW' | 'GREEN';
        priorityReason?: string | null;
      }[] = [];

      for (const item of items) {
        const newsHash = crypto.SHA256(item.link).toString();

        if (sentHashes.includes(newsHash)) {
          continue;
        }

        this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 80)}...`);
        const analyzedItem = await this.aiService.analyzeNewsUnified(item);

        await this.db.saveNews(analyzedItem);

        candidates.push({
          item: analyzedItem,
          priority: analyzedItem.priority || 'GREEN',
          priorityReason: analyzedItem.priorityReason,
        });
      }

      if (!candidates.length) {
        this.logger.log('📭 No new unsent news after filtering by hashes.');
        return;
      }

      const priorityRank: Record<string, number> = {
        RED: 3,
        YELLOW: 2,
        GREEN: 1,
      };

      candidates.sort((a, b) => {
        return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      });

      const best = candidates[0];

      if (!best) {
        this.logger.log('📭 No best candidate found.');
        return;
      }

      this.logger.log(
        `📤 Posting ${best.priority} news: ${best.item.title.slice(0, 80)}...`,
      );

      await this.telegramService.postNews(best.item);
      await this.db.markAsPosted(best.item.link);

      this.logger.log('✅ News posted successfully!');
    } catch (e) {
      this.logger.error('❌ scanAndPostOne failed', e);
    } finally {
      this.isScanning = false;
    }
  }
}
