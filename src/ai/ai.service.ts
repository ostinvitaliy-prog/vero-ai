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
  // Используем модель Gemini 1.5 Flash - она самая быстрая и бесплатная
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ языке.
         ПРАВИЛА:
         1. Используй ТОЛЬКО HTML (<b>, <i>, <a>). Никаких звездочек (**).
         2. ЗАПРЕЩЕНО делать блок "Термины". Объясняй сложные слова в скобках.
         3. Заголовок жирным <b>.
         4. В конце: "Может привести к:".`
      : `You are a Vero AI analyst. Summarize news in ENGLISH.
         RULES:
         1. Use ONLY HTML (<b>, <i>, <a>). No markdown.
         2. DO NOT create a "Terms" block. Explain terms in brackets.
         3. Bold title <b>.
         4. End with: "May lead to:".`;

    try {
      const response = await axios.post(this.apiUrl, {
        contents: [{
          parts: [{ text: `${prompt}\n\nНовость для обработки:\n${newsText}` }]
        }]
      });

      // Извлекаем текст из ответа Gemini
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      return 'Ошибка генерации текста через Gemini.';
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
