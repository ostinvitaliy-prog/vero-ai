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
  private readonly apiKey = process.env.ABACUSAI_API_KEY;

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ языке. ПРАВИЛА: 1. Используй ТОЛЬКО HTML (<b>, <i>, <a>). 2. Объясняй термины в скобках. 3. Заголовок жирным <b>. 4. В конце пиши: "Может привести к:".`
      : `You are Vero AI analyst. Summarize news in ENGLISH. 1. Use HTML (<b>, <i>, <a>). 2. Explain terms in brackets. 3. Bold title. 4. End with: "May lead to:".`;

    try {
      // Прямой вызов Abacus AI API
      const response = await axios.post(
        'https://api.abacus.ai/api/v0/getChatResponse',
        {
          messages: [{ role: 'user', content: `${prompt}\n\n${newsText}` }],
          // Если у тебя в Abacus есть конкретный Deployment ID, его можно вписать тут. 
          // Если нет, Abacus использует модель по умолчанию для ключа.
        },
        {
          headers: { 
            'apiKey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.result.content;
    } catch (error) {
      console.error('Abacus AI API Error:', error.response?.data || error.message);
      return 'Ошибка генерации текста через Abacus AI. Проверьте настройки API.';
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const summary = await this.generatePost(item.content || item.text || '', 'RU');
    return {
      ...item,
      text: summary || '',
      link: item.link || item.url || '',
      title: item.title || '',
      priority: (item.priority as 'RED' | 'YELLOW' | 'GREEN') || 'GREEN'
    };
  }
}
