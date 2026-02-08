import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  async sendNews(item: NewsItem, lang: 'RU' | 'EN') {
    const chatId = lang === 'RU' ? process.env.TELEGRAM_CHANNEL_RU : process.env.TELEGRAM_CHANNEL_EN;
    if (!chatId || !this.botToken) return;

    try {
      const photo = item.image || (item as any).enclosure?.url;
      if (photo && photo.startsWith('http')) {
        await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: chatId,
          photo: photo,
          caption: item.text,
          parse_mode: 'HTML'
        });
      } else {
        await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: chatId,
          text: item.text,
          parse_mode: 'HTML'
        });
      }
    } catch (e) {
      console.error(`Ошибка Telegram (${lang}):`, e.response?.data || e.message);
    }
  }
}
