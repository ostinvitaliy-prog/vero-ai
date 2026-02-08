import { Injectable } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { TelegramService } from './telegram/telegram.service';

@Injectable()
export class AppService {
  constructor(
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
  ) {}

  async testPost() {
    const mockNews = {
      title: "Bitcoin Market Update",
      text: "Bitcoin price remains stable above $95,000 as institutional demand grows.",
      link: "https://bits.media",
      image: "https://bits.media/upload/iblock/789/btc_crypto.jpg"
    };

    // 1. Отправляем в RU канал
    const ruContent = await this.aiService.generatePost(mockNews.text); 
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'RU');

    // 2. Отправляем в EN канал (для теста используем тот же текст, но ИИ можно попросить перевести)
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'EN');
    
    return { status: 'Success', message: 'Тест запущен для обоих каналов' };
  }
}
