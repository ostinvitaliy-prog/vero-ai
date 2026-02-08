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
  // Замени на ID твоей модели в Abacus, если он другой
  private readonly deploymentToken = process.env.ABACUS_DEPLOYMENT_TOKEN; 

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ. 1. Используй только HTML (<b>, <i>, <a>). 2. Блок "Термины" ЗАПРЕЩЕН. Объясняй в скобках. 3. Заголовок <b>. 4. В конце: "Может привести к:".`
      : `You are Vero AI analyst. Summarize in ENGLISH. 1. Use HTML. 2. No "Terms" block. 3. Bold title. 4. End with: "May lead to:".`;

    try {
      // Прямой запрос к API Abacus AI
      const response = await axios.post('https://api.abacus.ai/api/v0/getChatResponse', {
        deploymentToken: this.deploymentToken,
        messages: [{ role: 'user', content: `${prompt}\n\n${newsText}` }]
      }, {
        headers: { 'apiKey': this.apiKey }
      });

      return response.data.result.content;
    } catch (error) {
      console.error('Abacus AI Error:', error.response?.data || error.message);
      return 'Ошибка генерации текста';
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
