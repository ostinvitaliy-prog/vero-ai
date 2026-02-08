import { Injectable } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { TelegramService } from './telegram/telegram.service';

@Injectable()
export class AppService {
  constructor(
    private readonly aiService: AiService,
    private readonly telegramService: TelegramService,
  ) {}

  // Этот метод теперь называется так, как его ищет твой контроллер
  async processNews(newsItem: any) {
    const fullText = `${newsItem.title}\n\n${newsItem.text || ''}`;
    const aiContent = await this.aiService.generatePost(fullText);
    
    await this.telegramService.sendNews({
      ...newsItem,
      text: aiContent,
      priority: 'YELLOW'
    });
  }

  // Метод для ручного теста через /test/post
  async testPost() {
    const mockNews = {
      title: "Биткоин закрепился выше важного уровня",
      text: "Институциональные инвесторы продолжают накапливать активы, что создает дефицит предложения на биржах.",
      link: "https://bits.media",
      image: "https://bits.media/upload/iblock/789/btc_crypto.jpg"
    };

    await this.processNews(mockNews);
    
    return { status: 'Success', message: 'Тестовая новость отправлена' };
  }
}
