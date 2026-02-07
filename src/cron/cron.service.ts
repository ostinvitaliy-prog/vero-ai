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

  // Выполняется при запуске приложения
  async onApplicationBootstrap() {
    this.logger.log('🚀 Initializing startup scan...');
    await this.scanNews();
    
    // Сразу после сканирования постим ОДНУ новость для проверки
    this.logger.log('📤 Posting one immediate news item for verification...');
    await this.postOneImmediate();
  }

  // Скан каждый час
  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    await this.scanNews();
  }

  // Постинг по расписанию (ТЗ: 9, 13, 17, 21)
  @Cron('0 9,13,17,21 * * *')
  async handlePosting() {
    this.logger.log('⏰ Scheduled posting time reached.');
    await this.postNews();
  }

  async scanNews() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      this.logger.log('🔍 Starting news scan...');
      const items = await this.rssService.fetchFeeds();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      let newCount = 0;
      for (const item of items) {
        const exists = await this.db.news.findUnique({ where: { link: item.link } });
        if (!exists) {
          this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 60)}...`);
          const analysis = await this.aiService.analyzeNewsUnified(item);

          if (analysis.priority === 'RED' || analysis.priority === 'YELLOW') {
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
            this.logger.log(`✅ Added to buffer: ${analysis.priority} - ${item.title.slice(0, 50)}...`);
            newCount++;
          }
        }
      }
      this.logger.log(`🆕 Scan complete. Added ${newCount} items to buffer.`);
    } catch (e) {
      this.logger.error('❌ Scan failed', e);
    } finally {
      this.isScanning = false;
    }
  }

  // Метод для публикации ОДНОЙ новости (для старта)
  async postOneImmediate() {
    const pending = await this.db.news.findMany({
      where: { isPosted: false },
      orderBy: { pubDate: 'desc' },
      take: 1,
    });

    if (pending.length > 0) {
      const news = pending[0];
      this.logger.log(`📤 Posting immediate news: ${news.title}`);
      
      // Постим в оба канала
      await this.telegramService.sendPost(news, 'en');
      await this.telegramService.sendPost(news, 'ru');

      await this.db.news.update({
        where: { id: news.id },
        data: { isPosted: true },
      });
    } else {
      this.logger.warn('⚠️ No news in buffer to post immediately.');
    }
  }

  // Основной метод постинга (для крона)
  async postNews() {
    const pending = await this.db.news.findMany({
      where: { isPosted: false },
      orderBy: { pubDate: 'desc' },
      take: 5, // Берем до 5 свежих новостей за раз
    });

    if (pending.length === 0) {
      this.logger.log('📭 Buffer is empty, nothing to post.');
      return;
    }

    for (const news of pending) {
      try {
        await this.telegramService.sendPost(news, 'en');
        await this.telegramService.sendPost(news, 'ru');
        
        await this.db.news.update({
          where: { id: news.id },
          data: { isPosted: true },
        });
        
        // Небольшая пауза между постами, чтобы не спамить API Телеграма
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (e) {
        this.logger.error(`❌ Failed to post news ${news.id}`, e);
      }
    }
  }
}
