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
      ? `Ты — строгий крипто-аналитик. Твоя задача: оформить новость.
         ПРАВИЛА:
         1. ЗАГОЛОВОК: Начни с эмодзи (🔴, 🟡 или 🟢 по смыслу) и напиши заголовок ЖИРНЫМ КАПСОМ.
         2. СУТЬ: В 2-3 абзацах распиши детали. Используй ТОЛЬКО факты из присланного текста. НЕ ВЫДУМЫВАЙ ЦЕНЫ!
         3. ОТСТУП: Между блоками делай двойной перенос строки.
         4. VERO AI SUMMARY: Напиши простым языком, что это значит для рынка.
         5. ПРОГНОЗ: Список "Может привести к:" из 2-3 пунктов.
         6. ИНТЕРАКТИВ: "А что думаете вы? Пишите в комментариях! 👇"
         
         ФОРМАТ: Используй ТОЛЬКО HTML (<b>, <a>). Никаких звездочек. Каждый блок отделяй пустой строкой.`
      : `Strict analyst. HTML only. Bold caps title with emoji. No fake data. Double line breaks between blocks.`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional news editor. You use <b> and <a> tags. You never invent facts." },
          { role: "user", content: `ТЕКСТ НОВОСТИ ДЛЯ АНАЛИЗА:\n${newsText}\n\nИНСТРУКЦИЯ:\n${prompt}` }
        ],
        temperature: 0.3 // Снижаем температуру, чтобы ИИ меньше фантазировал
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      return `Ошибка генерации: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    // Сохраняем картинку, если она есть в исходнике
    const imageUrl = item.image || item.enclosure?.url || '';
    const summary = await this.generatePost(item.content || item.text || item.title || '', 'RU');
    
    return { 
      ...item, 
      text: summary, 
      link: item.link || item.url || '', 
      title: item.title || '',
      image: imageUrl, // Возвращаем картинку в объект
      priority: 'YELLOW' 
    };
  }
}
