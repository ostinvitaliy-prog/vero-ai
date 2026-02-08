import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'API Key Missing';

    const prompt = lang === 'RU' 
      ? `Ты — редактор Vero AI. Сделай Сверхкраткий пост.
         ПРАВИЛА:
         - Заголовок: 🟢/🟡/🔴 + <b>ЗАГОЛОВОК</b> + 🚀
         - Суть: 📝 1-2 предложения (факты).
         - Вывод: 💡 1 предложение.
         - Прогноз: 📉 2 пункта.
         - Хэштеги: #BTC #Крипто
         - HTML ТЕГИ: Только <b>. Никаких звёздочек!`
      : `You are Vero AI Editor. Be extremely concise.
         RULES:
         - Header: 🟢/🟡/🔴 + <b>HEADER</b> + 🚀
         - Core: 📝 1-2 sentences.
         - Takeaway: 💡 1 sentence.
         - Impact: 📉 2 points.
         - Hashtags: #Crypto #BTC
         - HTML TAGS: Use <b> only. No asterisks!`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `Journalist. Max 700 chars. Language: ${lang}` },
          { role: "user", content: `SOURCE:\n${newsText}\n\nTASK:\n${prompt}` }
        ],
        temperature: 0.1
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const imageUrl = item.image || item.enclosure?.url || '';
    const ruText = await this.generatePost(`${item.title}\n\n${item.content || ''}`, 'RU');
    return { title: item.title, link: item.link, text: ruText, image: imageUrl, priority: 'YELLOW', priorityReason: 'Update' };
  }
}
