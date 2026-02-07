import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';

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
      const items = await this.rssService.fetchAllNews();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      let redNews: any = null;
      let yellowNews: any = null;

      for (const item of items) {
        const exists = await this.db.news.findUnique({
          where: { link: item.link },
        });
        if (exists) continue;

        this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 80)}...`);
        const analysis = await this.aiService.analyzeNewsUnified(item);

        const savedNews = await this.db.news.create({
          data: {
            title: item.title,
            link: item.link,
            content: item.content,
            pubDate: item.pubDate,
            source: item.source,
            imageUrl: item.imageUrl,
            priority: analysis.priority,
            priorityReason: analysis.priorityReason,
            postEn: analysis.postEn,
            postRu: analysis.postRu,
            isPosted: false,
          },
        });

        if (analysis.priority === 'RED' && !redNews) {
          redNews = savedNews;
          break;
        }

        if (analysis.priority === 'YELLOW' && !yellowNews) {
          yellowNews = savedNews;
        }
      }

      const newsToPost = redNews || yellowNews;

      if (!newsToPost) {
        this.logger.log('📭 No important news found in this scan.');
        return;
      }

      this.logger.log(
        `📤 Posting ${newsToPost.priority} news: ${newsToPost.title.slice(0, 80)}...`,
      );

      await this.telegramService.postNews(newsToPost);

      await this.db.news.update({
        where: { id: newsToPost.id },
        data: { isPosted: true },
      });

      this.logger.log('✅ News posted successfully!');
    } catch (e) {
      this.logger.error('❌ scanAndPostOne failed', e);
    } finally {
      this.isScanning = false;
    }
  }
}
