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
    // Возвращаем fetchNews (как было в твоих первых логах)
    const news = await this.rssService.fetchNews(); 
    
    for (const item of news) {
      // Используем метод saveNews для проверки или обертку prisma, если она доступна
      // Если DatabaseService не имеет метода newsExists, билд упадет. 
      // Самый безопасный вариант — проверить через существующий метод поиска в твоем сервисе.
      const exists = await this.databaseService.getNewsByLink(item.link);

      if (!exists) {
        const ruText = await this.aiService.generatePost(item, 'RU');
        await this.telegramService.sendNews({ ...item, text: ruText, priority: 'YELLOW' }, 'RU');

        const enText = await this.aiService.generatePost(item, 'EN');
        await this.telegramService.sendNews({ ...item, text: enText, priority: 'YELLOW' }, 'EN');

        await this.databaseService.saveNews({ ...item, text: ruText, priority: 'YELLOW' });
      }
    }
  }
}
