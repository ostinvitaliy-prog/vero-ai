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
      ? `Напиши серьезный аналитический пост. 
         ШАБЛОН:
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Подробное описание новости, 4-5 предложений)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Экспертный вывод)
         
         ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b>
         • (Пункт 1)
         • (Пункт 2)
         
         🔗 <b>Источник:</b> <a href="${item.link}">Читать оригинал</a>
         
         #BTC #Crypto #Web3 #Blockchain`
      : `Write a professional analytical post.
         TEMPLATE:
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (Detailed news description, 4-5 sentences)
         
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
          { role: "system", content: "Senior Crypto Analyst. Detailed posts only. No general hashtags. HTML only." },
          { role: "user", content: `DATA:\n${item.title}\n${item.text || item.content}\n\nINSTRUCTION:\n${prompt}` }
        ],
        temperature: 0.3
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const imageUrl = item.image || item.enclosure?.url || '';
    const ruText = await this.generatePost(item, 'RU');
    return { title: item.title, link: item.link, text: ruText, image: imageUrl, priority: 'YELLOW', priorityReason: 'Analysis' };
  }
}
