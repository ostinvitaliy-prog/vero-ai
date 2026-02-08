import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(newsText: string) {
    if (!this.apiKey) return 'Ошибка: API ключ не найден';

    const prompt = `
      Ты — редактор Vero AI. Оформи новость строго по шаблону. 
      ВАЖНО: Общий объем текста не должен превышать 800 символов.
      
      1. ЗАГОЛОВОК: [Эмодзи приоритета 🔴/🟡/🟢] <b>ЗАГОЛОВОК КАПСОМ</b>
      2. ТЕКСТ: 2 коротких абзаца.
      3. SUMMARY: 💡 <b>VERO AI SUMMARY:</b> (1 предложение)
      4. ПРОГНОЗ: ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b> (2 пункта)
      5. ХЭШТЕГИ: #BTC #Крипто
      
      Используй только HTML (<b>, <a>).
    `;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Professional editor. Strict 800 chars limit. HTML only." },
          { role: "user", content: `ТЕКСТ:\n${newsText}\n\nИНСТРУКЦИЯ:\n${prompt}` }
        ],
        temperature: 0
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data.choices[0].message.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); 
    } catch (error) {
      return `Ошибка ИИ: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const imageUrl = item.image || item.enclosure?.url || '';
    const processedText = await this.generatePost(`${item.title}\n\n${item.content || ''}`);
    return { ...item, text: processedText, image: imageUrl, priority: 'YELLOW' };
  }
}
