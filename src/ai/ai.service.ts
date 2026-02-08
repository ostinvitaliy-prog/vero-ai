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
  // Используем стабильную версию API v1
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: Ключ GEMINI_API_KEY не найден';

    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ. ПРАВИЛА: 1. Только HTML (<b>, <i>, <a>). 2. Без блока "Термины". 3. Заголовок <b>. 4. В конце: "Может привести к:".`
      : `Analyze as Vero AI. English. HTML only. No terms block. Bold title. End with: "May lead to:".`;

    try {
      const response = await axios.post(this.apiUrl, {
        contents: [{
          role: "user",
          parts: [{ text: `${prompt}\n\n${newsText}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return result || 'ИИ вернул пустой ответ';
      
    } catch (error) {
      // Выводим детальную ошибку в логи Render
      const errorData = error.response?.data?.[0]?.error || error.response?.data?.error;
      console.error('Gemini Detail:', JSON.stringify(errorData));
      return `Ошибка API: ${error.response?.status || 'unknown'} - ${errorData?.message || 'Check Logs'}`;
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
