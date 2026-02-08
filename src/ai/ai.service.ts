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
      ? `Напиши профессиональный аналитический пост на РУССКОМ. Дай максимум мяса и цифр. 
         
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Развернутый текст новости, 6-8 предложений. Опиши контекст, причины и текущую ситуацию на рынке)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Глубокий экспертный вывод о том, что это значит для индустрии в долгосроке)
         
         ⚠️ <b>ЧЕГО ЖДАТЬ РЫНКУ:</b>
         • (Конкретный прогноз 1)
         • (Конкретный прогноз 2)
         • (Конкретный прогноз 3)
         
         🔗 <b>Источник:</b> <a href="${item.link || '#'}">Читать оригинал в источнике</a>
         
         #BTC #Crypto #Web3 #Blockchain #DeFi #Analytics`
      : `Write a comprehensive professional analytical post in ENGLISH.
         
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (Detailed news analysis, 6-8 sentences. Cover context, drivers, and market status)
         
         💡 <b>VERO AI SUMMARY:</b>
         (In-depth expert takeaway on long-term industry impact)
         
         ⚠️ <b>MARKET EXPECTATIONS:</b>
         • (Specific prediction 1)
         • (Specific prediction 2)
         • (Specific prediction 3)
         
         🔗 <b>Source:</b> <a href="${item.link || '#'}">Read original article</a>
         
         #BTC #Crypto #Web3 #Blockchain #DeFi #Analytics`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Senior Crypto Analyst. Focus on length, professional insights, and HTML formatting." },
          { role: "user", content: `SOURCE DATA:\n${item.title}\n${item.content || item.text}\n\nTASK:\n${prompt}` }
        ],
        temperature: 0.3
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error generating text: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const text = await this.generatePost(item, 'RU');
    return { title: item.title || 'No title', link: item.link || '', text, priority: 'YELLOW' };
  }
}
