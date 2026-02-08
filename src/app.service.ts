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
      title: "Bitcoin breaks $95k",
      text: "Bitcoin price surged past $95,000 today driven by massive institutional inflows into spot ETFs.",
      link: "https://bits.media",
      image: "https://crypto.ru/wp-content/uploads/2021/11/bitcoin-v-dele.jpg" 
    };

    // Генерируем RU
    const ruContent = await this.aiService.generatePost(mockNews.text, 'RU'); 
    await this.telegramService.sendNews({ ...mockNews, text: ruContent }, 'RU');

    // Генерируем EN
    const enContent = await this.aiService.generatePost(mockNews.text, 'EN');
    await this.telegramService.sendNews({ ...mockNews, text: enContent }, 'EN');
    
    return { status: 'Success', message: 'Каналы обновлены' };
  }
}
