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
  // Используем актуальную версию модели
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: GEMINI_API_KEY не найден в настройках';

    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ языке.
         ПРАВИЛА:
         1. Используй ТОЛЬКО HTML (<b>, <i>, <a>). Никаких звездочек.
         2. Не делай блок "Термины".
         3. Заголовок жирным <b>.
         4. В конце только фраза: "Может привести к:".`
      : `You are a Vero AI analyst. Summarize news in ENGLISH.
         RULES: 1. Use ONLY HTML. 2. No terms block. 3. Bold title. 4. End with: "May lead to:".`;

    try {
      const response = await axios.post(this.apiUrl, {
        contents: [{
          parts: [{ text: `${prompt}\n\nТекст новости:\n${newsText}` }]
        }]
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      // Безопасное извлечение текста
      const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return result || 'Не удалось получить текст от ИИ';
      
    } catch (error) {
      console.error('Gemini Error:', error.response?.data || error.message);
      return `Ошибка API: ${error.response?.status || 'unknown'}`;
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
