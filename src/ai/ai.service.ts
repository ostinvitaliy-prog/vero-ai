import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  url?: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string;
  source?: string;
  content?: string;
  pubDate?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  // Используем v1beta и модель 2.0 - это сейчас самый стабильный путь для новых ключей
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: Ключ GEMINI_API_KEY не найден';

    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ. 1. Только HTML (<b>, <i>, <a>). 2. Без блока "Термины". 3. Заголовок <b>. 4. В конце: "Может привести к:".`
      : `Analyze as Vero AI. Summarize news in English. Use ONLY HTML. No terms block. Bold title. End with: "May lead to:".`;

    try {
      const response = await axios.post(this.apiUrl, {
        contents: [{
          parts: [{ text: `${prompt}\n\n${newsText}` }]
        }]
      });

      const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return result || 'ИИ вернул пустой ответ';
      
    } catch (error) {
      // Если 2.0 вдруг не заведется (что вряд ли), выведем в ТГ конкретное имя модели, которое нужно
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error('Gemini Error:', errorMsg);
      return `Ошибка API: ${errorMsg}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const summary = await this.generatePost(item.content || item.text || '', 'RU');
    return {
      ...item,
      text: summary,
      link: item.link || item.url || '',
      title: item.title || '',
      priority: 'GREEN'
    };
  }
}
