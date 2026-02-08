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
      
      // Ссылка на фото прячется в невидимый символ в начале текста
      // Это заставляет Telegram отобразить превью картинки сверху поста
      const hiddenPhoto = photo ? `<a href="${photo}">&#8205;</a>` : '';
      const fullMessage = hiddenPhoto + item.text;

      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: fullMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: false // Важно: это включает отображение картинки
      });

      console.log(`✅ ${lang} posted as single message with photo`);
    } catch (e) {
      console.error(`Ошибка Telegram (${lang}):`, e.response?.data || e.message);
    }
  }
}
