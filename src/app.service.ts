import { Injectable } from '@nestjs/common';
import { AiService } from './ai/ai.service';
import { TelegramService } from './telegram/telegram.service';

@Injectable()
export class AppService {
  constructor(private readonly aiService: AiService, private readonly telegramService: TelegramService) {}

  async testPost() {
    const mock = {
      title: "Bitcoin breaks $95k",
      text: "Bitcoin price jumped to $95,000 as BlackRock ETF saw record inflows today.",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png"
    };

    // RU Канал
    const ruTxt = await this.aiService.generatePost(mock.text, 'RU');
    await this.telegramService.sendNews({ ...mock, text: ruTxt, priority: 'YELLOW', link: '' }, 'RU');

    // EN Канал
    const enTxt = await this.aiService.generatePost(mock.text, 'EN');
    await this.telegramService.sendNews({ ...mock, text: enTxt, priority: 'YELLOW', link: '' }, 'EN');

    return { status: 'Done' };
  }
}
