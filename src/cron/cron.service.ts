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
  ) {
    this.logger.log('✅ CronService initialized');
  }

  // При старте приложения — сразу одна новость
  async onApplicationBootstrap() {
    this.logger.log('🚀 Starting initial scan and posting one news...');
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
      // Используем fetchAllFeeds, как в твоем RssService
      const items = await this.rssService.fetchAllFeeds();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      let redNews = null;
      let yellowNews = null;

      for (const item of items) {
        // Проверяем через prisma.news, как в твоем DatabaseService
        const exists = await this.db.prisma.news.findUnique({ 
          where: { link: item.link } 
        });
        
        if (exists) continue;

        this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 60)}...`);
        const analysis = await this.aiService.analyzeNewsUnified(item);

        // Сохраняем в базу
        const savedNews = await this.db.prisma.news.create({
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

        // Запоминаем самую важную новость для этого часа
        if (analysis.priority === 'RED' && !redNews) {
          redNews = savedNews;
          break; // RED — топ приоритет
        }
        
        if (analysis.priority === 'YELLOW' && !yellowNews) {
          yellowNews = savedNews;
        }
      }

      // Выбираем что постить: RED > YELLOW
      const newsToPost = redNews || yellowNews;

      if (newsToPost) {
        this.logger.log(`📤 Posting ${newsToPost.priority} news: ${newsToPost.title.slice(0, 50)}...`);
        
        // Используем postNews, как в твоем TelegramService
        await this.telegramService.postNews(newsToPost, 'en');
        await this.telegramService.postNews(newsToPost, 'ru');

        // Помечаем как опубликованную
        await this.db.prisma.news.update({
          where: { id: newsToPost.id },
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
