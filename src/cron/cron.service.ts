import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.debug('Запуск сбора новостей...');
    const news = await this.rssService.getLatestNews();
    
    if (news && news.length > 0) {
      // Берем самую свежую новость
      const analyzed = await this.aiService.analyzeNewsUnified(news[0]);
      await this.telegramService.sendNews(analyzed);
    }
  }
}
