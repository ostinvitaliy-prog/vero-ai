import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  async sendNews(item: NewsItem, lang: 'RU' | 'EN' = 'RU') {
    if (!this.botToken) {
      console.error('Telegram: TELEGRAM_BOT_TOKEN не настроен');
      return;
    }

    // Выбираем ID канала в зависимости от языка
    const chatId = lang === 'RU' 
      ? process.env.TELEGRAM_CHANNEL_RU 
      : process.env.TELEGRAM_CHANNEL_EN;

    if (!chatId) {
      console.error(`Telegram: Не настроен ID канала для языка ${lang}`);
      return;
    }

    try {
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
      console.log(`Новость успешно отправлена в ${lang} канал`);
    } catch (error) {
      console.error(`Ошибка отправки в Telegram (${lang}):`, error.response?.data || error.message);
    }
  }
}
