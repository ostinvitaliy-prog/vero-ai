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
      const payload = {
        chat_id: chatId,
        parse_mode: 'HTML',
      };

      if (item.image && item.image.startsWith('http')) {
        await axios.post(`${this.apiUrl}/sendPhoto`, { ...payload, photo: item.image, caption: item.text });
      } else {
        await axios.post(`${this.apiUrl}/sendMessage`, { ...payload, text: item.text });
      }
    } catch (e) {
      console.error(`Telegram Error (${lang}):`, e.response?.data || e.message);
    }
  }
}
