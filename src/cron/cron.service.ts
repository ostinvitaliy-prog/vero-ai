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
    private rssService: RssService,
    private aiService: AiService,
    private db: DatabaseService,
    private telegramService: TelegramService,
  ) {}

  // При старте приложения — сразу одна новость
  async onApplicationBootstrap() {
    this.logger.log('🚀 Initializing startup scan and posting...');
    await this.scanAndPostOne();
  }

  // Каждый час — сканируем и постим ОДНУ самую важную новость
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyScan() {
    await this.scanAndPostOne();
  }

  async scanAndPostOne() {
    if (this.isScanning) {
      this.logger.warn('⚠️ Scan already in progress, skipping...');
      return;
    }
    
    this.isScanning = true;

    try {
      this.logger.log('🔍 Starting hourly news scan...');
      const items = await this.rssService.fetchFeeds();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      let redNews = null;
      let yellowNews = null;

      for (const item of items) {
        // Проверяем, не публиковали ли мы эту новость ранее
        const exists = await this.db.news.findUnique({ where: { link: item.link } });
        if (exists) continue;

        this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 60)}...`);
        const analysis = await this.aiService.analyzeNewsUnified(item);

        // Сохраняем в базу для истории
        await this.db.news.create({
          data: {
            ...item,
            priority: analysis.priority,
            priorityReason: analysis.priorityReason,
            postEn: analysis.postEn,
            postRu: analysis.postRu,
            isPosted: false,
          },
        });

        // Запоминаем самую важную новость
        if (analysis.priority === 'RED' && !redNews) {
          redNews = { ...item, ...analysis };
          break; // RED — максимальный приоритет, дальше можно не искать
        }
        
        if (analysis.priority === 'YELLOW' && !yellowNews) {
          yellowNews = { ...item, ...analysis };
        }
      }

      // Выбираем что постить: RED > YELLOW
      const newsToPost = redNews || yellowNews;

      if (newsToPost) {
        this.logger.log(`📤 Posting ${newsToPost.priority} news: ${newsToPost.title.slice(0, 50)}...`);
        
        // Постим в оба канала
        await this.telegramService.sendPost(newsToPost, 'en');
        await this.telegramService.sendPost(newsToPost, 'ru');

        // Помечаем как опубликованную
        await this.db.news.updateMany({
          where: { link: newsToPost.link },
          data: { isPosted: true },
        });

        this.logger.log('✅ News posted successfully!');
      } else {
        this.logger.log('📭 No important news found in this scan.');
      }

    } catch (e) {
      this.logger.error('❌ Scan and post failed', e);
    } finally {
      this.isScanning = false;
    }
  }
}
