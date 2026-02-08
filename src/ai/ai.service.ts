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
      ? `Напиши подробный аналитический пост. 
         ПРАВИЛА:
         1. 🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         2. Текст новости: 4-5 информативных предложений.
         3. 💡 <b>VERO AI SUMMARY:</b> (глубокий вывод)
         4. ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b> (2 конкретных пункта)
         5. 🔗 <b>Источник:</b> <a href="${item.link}">Читать оригинал</a>
         6. ХЭШТЕГИ: Только про криптовалюту (напр. #BTC #ETH #Crypto #Web3). Никаких общих тегов.
         
         Язык: РУССКИЙ. HTML: <b> и <a>.`
      : `Write a detailed analytical post.
         RULES:
         1. 🟢 <b>HEADER IN CAPS</b> 🚀
         2. News text: 4-5 informative sentences.
         3. 💡 <b>VERO AI SUMMARY:</b> (deep analytical takeaway)
         4. ⚠️ <b>MAY LEAD TO:</b> (2 specific points)
         5. 🔗 <b>Source:</b> <a href="${item.link}">Read original</a>
         6. HASHTAGS: Only crypto-related (e.g. #BTC #ETH #Crypto #DeFi). No general tags.
         
         Language: ENGLISH. HTML: <b> and <a>.`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a senior crypto analyst. Write detailed, professional posts. Use ONLY crypto hashtags. HTML only." },
          { role: "user", content: `SOURCE:\n${item.title}\n${item.text || item.content}\n\nINSTRUCTION:\n${prompt}` }
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
