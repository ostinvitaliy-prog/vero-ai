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
    const mock = {
      title: "Bitcoin breaks $95k",
      text: "Bitcoin price jumped to $95,000 as BlackRock ETF saw record inflows today. Institutional demand is surging.",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png",
      link: "https://bits.media"
    };

    // Генерируем RU через обновленный метод
    const ruText = await this.aiService.generatePost(mock, 'RU');
    await this.telegramService.sendNews({ ...mock, text: ruText, priority: 'YELLOW' }, 'RU');

    // Генерируем EN через обновленный метод
    const enText = await this.aiService.generatePost(mock, 'EN');
    await this.telegramService.sendNews({ ...mock, text: enText, priority: 'YELLOW' }, 'EN');

    return { status: 'Done', message: 'Check your channels' };
  }
}
