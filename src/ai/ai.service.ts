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

  async generatePost(item: any, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'API Key Missing';

    const prompt = lang === 'RU'
      ? `ПЕРЕВЕДИ И ОФОРМИ новость на РУССКИЙ язык.
         ШАБЛОН:
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Подробный текст новости на РУССКОМ, 4-5 предложений)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Твой экспертный вывод на русском)
         
         ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b>
         • (Пункт 1)
         • (Пункт 2)
         
         🔗 <b>Источник:</b> <a href="${item.link}">Читать оригинал</a>
         
         #BTC #Crypto #Web3 #Blockchain`
      : `ANALYZE AND FORMAT this news in ENGLISH.
         TEMPLATE:
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (Detailed news text in ENGLISH, 4-5 sentences)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Analytical takeaway)
         
         ⚠️ <b>MAY LEAD TO:</b>
         • (Point 1)
         • (Point 2)
         
         🔗 <b>Source:</b> <a href="${item.link}">Read original</a>
         
         #BTC #Crypto #Web3 #Blockchain`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `Senior Crypto Analyst. Target language: ${lang}. Use HTML.` },
          { role: "user", content: `SOURCE NEWS (EN):\nTitle: ${item.title}\nContent: ${item.content || item.text}\n\nINSTRUCTION:\n${prompt}` }
        ],
        temperature: 0.2
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // Метод заглушка для совместимости
  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const text = await this.generatePost(item, 'RU');
    return { ...item, text, priority: 'YELLOW' };
  }
}
