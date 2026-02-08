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
      text: "Биткоин показывает стабильность выше $95,000, пока институционалы наращивают позиции в ETF.",
      title: "Рынок BTC сегодня",
      link: "https://bits.media",
      image: "https://bits.media/upload/iblock/789/btc_crypto.jpg"
    };

    const content = await this.aiService.generatePost(mockNews.text);
    await this.telegramService.sendNews({
      ...mockNews,
      text: content,
      priority: 'YELLOW'
    });
    
    return { status: 'Success', message: 'Test news sent to Telegram' };
  }
}
