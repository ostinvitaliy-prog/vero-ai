import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService, NewsItem } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto-js';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.log('🔄 Синхронизация новостей...');
    const news = await this.rssService.getLatestNews();
    
    for (const item of news.slice(0, 3)) {
      const link = item.link || item.guid || '';
      if (!link) continue;

      const newsHash = crypto.SHA256(link).toString();
      const existing = await this.databaseService.sent_news.findUnique({
        where: { news_hash: newsHash }
      });

      if (!existing) {
        try {
          const ruContent = await this.aiService.generatePost(item, 'RU');
          const enContent = await this.aiService.generatePost(item, 'EN');

          const ruNews: NewsItem = {
            title: item.title || 'No Title',
            link: link,
            text: ruContent,
            priority: 'YELLOW',
            image: item.enclosure?.url || ''
          };

          const enNews: NewsItem = {
            title: item.title || 'No Title',
            link: link,
            text: enContent,
            priority: 'YELLOW',
            image: item.enclosure?.url || ''
          };

          await this.telegramService.sendNews(ruNews, 'RU');
          await this.telegramService.sendNews(enNews, 'EN');
          await this.databaseService.saveNews(ruNews);
          
          this.logger.log(`✅ Опубликовано: ${item.title}`);
        } catch (error) {
          this.logger.error(`Ошибка: ${error.message}`);
        }
      }
    }
  }
}
