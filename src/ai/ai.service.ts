import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  url?: string;
  priority?: string;
  priorityReason?: string;
  source?: string;
  content?: string;
  pubDate?: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ. 1. Используй только HTML (<b>, <i>, <a>). 2. Блок "Термины" ЗАПРЕЩЕН. Объясняй в скобках. 3. Заголовок <b>. 4. В конце: "Может привести к:".`
      : `You are Vero AI analyst. Summarize in ENGLISH. 1. Use HTML. 2. No "Terms" block. 3. Bold title. 4. End with: "May lead to:".`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "system", content: prompt }, { role: "user", content: newsText }],
      temperature: 0.5,
    });
    return completion.choices[0].message.content;
  }

  // Этот метод требует твой cron.service.ts
  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const summary = await this.generatePost(item.content || item.text || '', 'RU');
    return {
      ...item,
      text: summary || '',
      link: item.link || item.url || '',
      title: item.title || '',
      priority: 'GREEN'
    };
  }
}
