import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CronService {
  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    // В твоем RssService метод называется getNews, а не fetchNews
    const news = await this.rssService.getNews(); 
    
    for (const item of news) {
      // Проверяем существование новости напрямую через prisma в DatabaseService
      const exists = await this.databaseService.news.findUnique({
        where: { link: item.link }
      });

      if (!exists) {
        // 1. Пост для RU канала
        const ruText = await this.aiService.generatePost(item, 'RU');
        await this.telegramService.sendNews({ ...item, text: ruText, priority: 'YELLOW' }, 'RU');

        // 2. Пост для EN канала
        const enText = await this.aiService.generatePost(item, 'EN');
        await this.telegramService.sendNews({ ...item, text: enText, priority: 'YELLOW' }, 'EN');

        // 3. Сохранение
        await this.databaseService.saveNews({ ...item, text: ruText, priority: 'YELLOW' });
      }
    }
  }
}
