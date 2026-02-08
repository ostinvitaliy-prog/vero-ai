import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string; // Возвращаем для DatabaseService
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'API Key error';

    const prompt = lang === 'RU' 
      ? `Ты — редактор Vero AI. Сделай СТИЛЬНЫЙ и КРАТКИЙ пост.
         СТРУКТУРА (строго до 800 символов):
         1. 🟢/🟡/🔴 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         2. 📝 <b>СУТЬ:</b> (коротко с эмодзи)
         3. 💡 <b>Vero AI Summary:</b> (вывод)
         4. 📉 <b>Прогноз:</b>
            • Пункт 1
         5. #BTC #Крипто`
      : `You are Vero AI Editor. Create a STYLISH post in ENGLISH.
         STRUCTURE (under 800 chars):
         1. 🟢/🟡/🔴 <b>HEADER IN CAPS</b> 🚀
         2. 📝 <b>CORE:</b> (short with emojis)
         3. 💡 <b>Vero AI Summary:</b> (takeaway)
         4. 📉 <b>Impact:</b>
            • Point 1
         5. #Crypto #BTC`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `Crypto journalist. HTML (<b>) only. Max 800 chars. Language: ${lang}` },
          { role: "user", content: `SOURCE:\n${newsText}\n\nINSTRUCTION:\n${prompt}` }
        ],
        temperature: 0.1
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `AI Error: ${error.message}`;
    }
  }

  // Восстанавливаем метод, который ищет CronService
  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const imageUrl = item.image || item.enclosure?.url || '';
    const fullText = `${item.title}\n\n${item.content || ''}`;
    const processedText = await this.generatePost(fullText, 'RU');
    
    return { 
      title: item.title || '',
      link: item.link || '',
      text: processedText, 
      image: imageUrl, 
      priority: 'YELLOW',
      priorityReason: 'Market update' 
    };
  }
}
