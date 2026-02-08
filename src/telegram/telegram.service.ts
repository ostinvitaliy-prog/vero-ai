import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  async sendNews(item: NewsItem, lang: 'RU' | 'EN' = 'RU') {
    if (!this.botToken) return console.error('Telegram: TOKEN не настроен');

    const chatId = lang === 'RU' 
      ? process.env.TELEGRAM_CHANNEL_RU 
      : process.env.TELEGRAM_CHANNEL_EN;

    if (!chatId) return console.error(`Telegram: Не настроен ID канала для ${lang}`);

    try {
      // Лимит Telegram для подписи к фото — 1024 символа
      const isTooLong = item.text.length > 1024;

      if (item.image && item.image.startsWith('http') && !isTooLong) {
        // Если текст влезает — шлем фото с подписью
        await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: chatId,
          photo: item.image,
          caption: item.text,
          parse_mode: 'HTML',
        });
      } else {
        // Если текста много или нет картинки — шлем картинку (если есть), а потом ТЕКСТ отдельно
        if (item.image && item.image.startsWith('http')) {
          await axios.post(`${this.apiUrl}/sendPhoto`, { chat_id: chatId, photo: item.image });
        }
        await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: chatId,
          text: item.text,
          parse_mode: 'HTML',
        });
      }
      console.log(`Новость отправлена в ${lang}`);
    } catch (error) {
      console.error(`Ошибка отправки в Telegram (${lang}):`, error.response?.data || error.message);
    }
  }
}
