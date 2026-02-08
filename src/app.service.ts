import { Injectable } from '@nestjs/common';
import { AIService } from './services/ai.service';
import { TelegramService } from './services/telegram.service';

@Injectable()
export class AppService {
  constructor(
    private readonly aiService: AIService,
    private readonly telegramService: TelegramService,
  ) {}

  async processNews(newsItem: any) {
    // 1. RU
    const ruContent = await this.aiService.generatePost(newsItem.text, 'RU');
    if (ruContent) {
      await this.telegramService.sendToChannel('TELEGRAM_CHANNEL_RU', ruContent, newsItem.image);
    }

    // 2. EN
    const enContent = await this.aiService.generatePost(newsItem.text, 'EN');
    if (enContent) {
      await this.telegramService.sendToChannel('TELEGRAM_CHANNEL_EN', enContent, newsItem.image);
    }
  }
}
