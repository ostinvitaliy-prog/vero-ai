import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string; link: string; title: string; image?: string;
  url?: string; priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string; source?: string; content?: string; pubDate?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: GROQ_API_KEY не найден';

    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ. ПРАВИЛА: 1. Только HTML (<b>, <i>, <a>). 2. Без блока "Термины". 3. Заголовок <b>. 4. В конце: "Может привести к:".`
      : `Analyze as Vero AI. English. HTML only. Bold title. End with: "May lead to:".`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `${prompt}\n\n${newsText}` }],
        temperature: 0.5
      }, {
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      return `Ошибка Groq: ${error.response?.data?.error?.message || error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const summary = await this.generatePost(item.content || item.text || '', 'RU');
    return { ...item, text: summary, link: item.link || item.url || '', title: item.title || '', priority: 'GREEN' };
  }
}
