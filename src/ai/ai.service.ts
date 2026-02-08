import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  priority?: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(item: any, lang: 'RU' | 'EN'): Promise<string> {
    if (!this.apiKey) return 'API Key Missing';

    const prompt = lang === 'RU'
      ? `Оформи аналитическую новость на РУССКОМ.
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Подробный текст, 4-5 предложений с фактами)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Экспертный вывод)
         
         ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b>
         • (Пункт 1)
         • (Пункт 2)
         
         🔗 <b>Источник:</b> <a href="${item.link || '#'}">Читать оригинал</a>
         
         #BTC #Crypto #Web3 #Blockchain`
      : `Analyze and format news in ENGLISH.
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (Detailed news text, 4-5 sentences)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Analytical takeaway)
         
         ⚠️ <b>MAY LEAD TO:</b>
         • (Point 1)
         • (Point 2)
         
         🔗 <b>Source:</b> <a href="${item.link || '#'}">Read original</a>
         
         #BTC #Crypto #Web3 #Blockchain`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Senior Crypto Analyst. HTML only. Crypto hashtags only." },
          { role: "user", content: `DATA:\n${item.title}\n${item.content || item.text}\n\nTASK:\n${prompt}` }
        ],
        temperature: 0.2
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error generating text: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const text = await this.generatePost(item, 'RU');
    return { 
      title: item.title || 'No title', 
      link: item.link || '', 
      text: text, 
      priority: 'YELLOW' 
    };
  }
}
