import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface NewsItem {
  text: string;
  link: string;
  title: string;
  image?: string;
  url?: string;
  priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string;
  source?: string;
  content?: string;
  pubDate?: string;
}

@Injectable()
export class AiService {
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: GROQ_API_KEY не найден';

    const prompt = lang === 'RU' 
      ? `Ты — профессиональный редактор новостей. Твоя задача — оформить текст.
         
         ПРАВИЛА ОФОРМЛЕНИЯ:
         1. ПЕРВАЯ СТРОКА: Начни с 🟡 и напиши заголовок жирным КАПСОМ: <b>ЗАГОЛОВОК</b> 🚀
         2. ТЕЛО: Напиши 2-3 абзаца текста СТРОГО на основе предоставленных данных. Не выдумывай факты или цены!
         3. ПЕРЕНОСЫ: Между блоками обязательно делай двойной перенос строки для читаемости.
         4. БЛОК SUMMARY: 💡 <b>VERO AI SUMMARY:</b> и напиши простым языком суть новости.
         5. БЛОК ПРОГНОЗ: ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b> и список из 2-3 пунктов с эмодзи.
         6. ИНТЕРАКТИВ: 💬 <b>А что об этом думаете вы? Пишите в комментариях!</b> 👇
         
         ВАЖНО: Используй ТОЛЬКО HTML (<b>, <a>). Никаких Markdown звездочек (**).`
      : `Strict analyst. HTML only. Bold caps title. Use double line breaks between blocks.`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional news editor. Output ONLY clean HTML tags <b> and <a>. Never use markdown symbols like **. Do not invent information." },
          { role: "user", content: `ТЕКСТ ДЛЯ ОБРАБОТКИ:\n${newsText}` }
        ],
        temperature: 0.1 // Минимальная фантазия, только факты
      }, {
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        }
      });

      let result = response.data.choices[0].message.content;
      // Принудительная замена, если модель все же прислала маркдаун
      result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      return result;
    } catch (error) {
      console.error('Groq Error:', error.response?.data || error.message);
      return `Ошибка генерации: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    // Продвинутый поиск картинки в RSS объекте
    const imageUrl = item.image || 
                     item.enclosure?.url || 
                     item['media:content']?.['@_url'] || 
                     item.meta?.image || '';

    const summary = await this.generatePost(item.content || item.text || item.title || '', 'RU');
    
    return { 
      ...item, 
      text: summary, 
      link: item.link || item.url || '', 
      title: item.title || '',
      image: imageUrl,
      priority: 'YELLOW' 
    };
  }
}
