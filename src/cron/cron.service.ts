import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
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
    this.logger.log('🔄 Запуск синхронизации...');
    const news = await this.rssService.getLatestNews();
    
    for (const item of news.slice(0, 3)) {
      const link = item.link || item.guid;
      if (!link) continue;

      const newsHash = crypto.SHA256(link).toString();
      const existing = await this.databaseService.sent_news.findUnique({
        where: { news_hash: newsHash }
      });

      if (!existing) {
        try {
          const ruText = await this.aiService.generatePost(item, 'RU');
          await this.telegramService.sendNews({ ...item, text: ruText, priority: 'YELLOW' }, 'RU');

          const enText = await this.aiService.generatePost(item, 'EN');
          await this.telegramService.sendNews({ ...item, text: enText, priority: 'YELLOW' }, 'EN');

          await this.databaseService.saveNews({
            title: item.title,
            link: link,
            text: ruText,
            priority: 'YELLOW',
            priorityReason: 'Auto-sync'
          });
        } catch (error) {
          this.logger.error(`Ошибка обработки: ${error.message}`);
        }
      }
    }
  }
}
