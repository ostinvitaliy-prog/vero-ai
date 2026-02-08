import { Injectable } from '@nestjs/common';
import { AiService, NewsItem } from './ai/ai.service';
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
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png" 
    };

    // RU
    const ruText = await this.aiService.generatePost(mockNews.text, 'RU'); 
    const ruItem: NewsItem = { ...mockNews, text: ruText, priority: 'YELLOW' };
    await this.telegramService.sendNews(ruItem, 'RU');

    // EN
    const enText = await this.aiService.generatePost(mockNews.text, 'EN');
    const enItem: NewsItem = { ...mockNews, text: enText, priority: 'YELLOW' };
    await this.telegramService.sendNews(enItem, 'EN');
    
    return { status: 'Success', message: 'Каналы обновлены' };
  }
}
