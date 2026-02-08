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
    const fullText = `${newsItem.title}\n\n${newsItem.text || ''}`;
    const aiContent = await this.aiService.generatePost(fullText);
    
    await this.telegramService.sendNews({
      ...newsItem,
      text: aiContent,
      priority: 'YELLOW'
    }, 'RU');
  }

  async testPost() {
    const mockNews = {
      title: "Bitcoin Market Update",
      text: "Биткоин закрепился выше уровня $95,000 на фоне высокого спроса со стороны институциональных инвесторов.",
      link: "https://bits.media",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png"
    };

    // 1. Генерируем контент через ИИ
    const ruContent = await this.aiService.generatePost(mockNews.text); 

    // 2. Отправляем в RU канал
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'RU');

    // 3. Отправляем в EN канал
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'EN');
    
    return { status: 'Success', message: 'Тест запущен с корректной картинкой' };
  }
}
