import { Injectable } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { TelegramService } from './telegram/telegram.service';

@Injectable()
export class AppService {
  constructor(
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
  ) {}

  async processNews(newsItem: any) {
    const ruContent = await this.aiService.generatePost(newsItem.text, 'RU');
    if (ruContent) {
      await this.telegramService.sendToChannel('TELEGRAM_CHANNEL_RU', ruContent, newsItem.image);
    }
    const enContent = await this.aiService.generatePost(newsItem.text, 'EN');
    if (enContent) {
      await this.telegramService.sendToChannel('TELEGRAM_CHANNEL_EN', enContent, newsItem.image);
    }
  }
}
