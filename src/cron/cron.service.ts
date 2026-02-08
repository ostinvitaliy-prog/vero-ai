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
    const news = await this.rssService.fetchNews();
    for (const item of news) {
      const exists = await this.databaseService.newsExists(item.link);
      if (!exists) {
        // 1. Генерируем и отправляем RU
        const ruText = await this.aiService.generatePost(item, 'RU');
        await this.telegramService.sendNews({ ...item, text: ruText, priority: 'YELLOW' }, 'RU');

        // 2. Генерируем и отправляем EN
        const enText = await this.aiService.generatePost(item, 'EN');
        await this.telegramService.sendNews({ ...item, text: enText, priority: 'YELLOW' }, 'EN');

        // 3. Сохраняем в базу (как RU вариант)
        await this.databaseService.saveNews({ ...item, text: ruText, priority: 'YELLOW' });
      }
    }
  }
}
