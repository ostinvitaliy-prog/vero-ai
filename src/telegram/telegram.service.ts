import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  async sendNews(item: NewsItem, lang: 'RU' | 'EN' = 'RU') {
    if (!this.botToken) return;

    const chatId = lang === 'RU' 
      ? process.env.TELEGRAM_CHANNEL_RU 
      : process.env.TELEGRAM_CHANNEL_EN;

    if (!chatId) return;

    try {
      // Всегда шлем фото с подписью. AI в AiService теперь ограничен 800 символами, так что влезет всегда.
      if (item.image && item.image.startsWith('http')) {
        await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: chatId,
          photo: item.image,
          caption: item.text,
          parse_mode: 'HTML',
        });
      } else {
        await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: chatId,
          text: item.text,
          parse_mode: 'HTML',
        });
      }
      console.log(`Sent to ${lang}`);
    } catch (error) {
      console.error(`Error ${lang}:`, error.response?.data || error.message);
    }
  }
}
