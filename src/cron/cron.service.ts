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
  ) {}

  async onApplicationBootstrap() {
    await this.scanAndPostOne();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyScan() {
    await this.scanAndPostOne();
  }

  async scanAndPostOne() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      const items: NewsItem[] = await this.rssService.fetchAllNews();
      if (!items.length) return;

      const sentHashes = await this.db.getAllNewsHashes();
      const candidates: { item: NewsItem; priority: 'RED' | 'YELLOW' | 'GREEN' }[] = [];

      for (const item of items) {
        const newsHash = crypto.SHA256(item.link).toString();
        if (sentHashes.includes(newsHash)) continue;

        const analyzedItem = await this.aiService.analyzeNewsUnified(item);
        await this.db.saveNews(analyzedItem);

        candidates.push({
          item: analyzedItem,
          priority: analyzedItem.priority || 'GREEN',
        });
      }

      if (!candidates.length) return;

      const priorityRank: Record<string, number> = { RED: 3, YELLOW: 2, GREEN: 1 };
      candidates.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);

      const best = candidates[0].item;
      await this.telegramService.postNews(best);
      await this.db.markAsPosted(best.link);

      this.logger.log(`✅ Posted: ${best.title}`);
    } catch (e) {
      this.logger.error('❌ Scan failed', e);
    } finally {
      this.isScanning = false;
    }
  }
}
