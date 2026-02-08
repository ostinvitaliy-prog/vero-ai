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
      ? `ПЕРЕВЕДИ на РУССКИЙ и оформи:
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Детальный разбор, 4-5 предложений)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Экспертный вывод)
         
         ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b>
         • (Пункт 1)
         • (Пункт 2)
         
         🔗 <b>Источник:</b> <a href="${item.link}">Читать оригинал</a>
         
         #BTC #Crypto #Web3 #Blockchain`
      : `ANALYZE in ENGLISH and format:
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (Detailed analysis, 4-5 sentences)
         
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
          { role: "system", content: `Crypto Analyst. Language: ${lang}. HTML only.` },
          { role: "user", content: `NEWS:\n${item.title}\n${item.content || item.text}\n\nTASK:\n${prompt}` }
        ],
        temperature: 0.2
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const text = await this.generatePost(item, 'RU');
    return { ...item, text, priority: 'YELLOW' };
  }
}
