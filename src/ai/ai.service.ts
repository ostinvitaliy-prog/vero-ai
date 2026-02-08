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
      ? `ТЫ — КРИПТО-АНАЛИТИК. ПИШИ ТОЛЬКО ПРАВДУ. Если в новости указана цена BTC $95k, а ты знаешь, что сейчас рынок в районе $70k — исправь это или пиши осторожно.
         
         СТРОГО: Текст сообщения должен быть информативным, но НЕ ПРЕВЫШАТЬ 900 символов (это критично для Telegram).
         
         ФОРМАТ:
         🟢 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         
         (Суть новости: 4-5 мощных предложений)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Экспертный вывод)
         
         ⚠️ <b>ЧЕГО ЖДАТЬ РЫНКУ:</b>
         • (Пункт 1)
         • (Пункт 2)
         
         🔗 <b>Источник:</b> <a href="${item.link || '#'}">Читать оригинал</a>
         
         #BTC #Crypto #Web3 #Blockchain`
      : `YOU ARE A CRYPTO ANALYST. BE ACCURATE. Do not hallucinate prices.
         
         STRICT: Text must be informative but UNDER 900 characters (critical for Telegram photo caption).
         
         FORMAT:
         🟢 <b>HEADER IN CAPS</b> 🚀
         
         (News essence: 4-5 powerful sentences)
         
         💡 <b>VERO AI SUMMARY:</b>
         (Analytical takeaway)
         
         ⚠️ <b>MARKET EXPECTATIONS:</b>
         • (Point 1)
         • (Point 2)
         
         🔗 <b>Source:</b> <a href="${item.link || '#'}">Read original</a>
         
         #BTC #Crypto #Web3 #Blockchain`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Senior Crypto Analyst. Accuracy is key. Strictly under 900 chars. HTML only." },
          { role: "user", content: `DATA:\n${item.title}\n${item.content || item.text}\n\nTASK:\n${prompt}` }
        ],
        temperature: 0.1
      }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });

      let content = response.data.choices[0].message.content.replace(/\*\*/g, '');
      return content.length > 1000 ? content.substring(0, 950) + '...' : content;
    } catch (error) {
      return `Error generating text: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const text = await this.generatePost(item, 'RU');
    return { title: item.title || 'No title', link: item.link || '', text, priority: 'YELLOW' };
  }
}
