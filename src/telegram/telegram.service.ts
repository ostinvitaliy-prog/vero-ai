import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class TelegramService {
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;
  private readonly apiUrl = `https://api.telegram.org/bot${this.botToken}`;

  async sendNews(item: NewsItem) {
    if (!this.botToken || !this.chatId) {
      console.error('Telegram: Не настроены TOKEN или CHAT_ID');
      return;
    }

    // Текст уже отформатирован в AiService (HTML)
    const caption = item.text;

    try {
      if (item.image && item.image.startsWith('http')) {
        // Если есть картинка, используем sendPhoto
        await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: this.chatId,
          photo: item.image,
          caption: caption,
          parse_mode: 'HTML',
        });
        console.log('Новость отправлена с фото');
      } else {
        // Если картинки нет, шлем обычное сообщение
        await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: this.chatId,
          text: caption,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        });
        console.log('Новость отправлена без фото (текст)');
      }
    } catch (error) {
      console.error('Ошибка отправки в Telegram:', error.response?.data || error.message);
      
      // Резервный вариант: если фото не прошло (например, битая ссылка), пробуем отправить хотя бы текст
      if (item.image) {
        try {
          await axios.post(`${this.apiUrl}/sendMessage`, {
            chat_id: this.chatId,
            text: caption,
            parse_mode: 'HTML',
          });
        } catch (retryError) {
          console.error('Полный провал отправки:', retryError.message);
        }
      }
    }
  }
}
