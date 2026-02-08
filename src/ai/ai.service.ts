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
    if (!this.apiKey) return 'Ошибка: GROQ_API_KEY не найден в Render';

    const prompt = lang === 'RU' 
      ? `Ты — ведущий аналитик Vero AI. Сделай сочный и структурированный пост.
         ПРАВИЛА:
         1. ПЕРВАЯ СТРОКА: Эмодзи (🟡, 🟢 или 🔴 по смыслу новости) + заголовок жирным <b>ВЕРХНИМ РЕГИСТРОМ</b> + эмодзи ракеты или огня.
         2. СРАЗУ ПОСЛЕ: Информативный текст новости без лишних вступлений (не пиши "О чем новость"). Выделяй важные цифры и названия жирным <b>.
         3. РАЗДЕЛИТЕЛЬ: ---
         4. БЛОК "💡 VERO AI SUMMARY": Твое авторское пояснение простым языком о влиянии на рынок.
         5. БЛОК "⚠️ МОЖЕТ ПРИВЕСТИ К": Список из 3 конкретных пунктов с эмодзи в начале.
         6. РАЗДЕЛИТЕЛЬ: ---
         7. ИНТЕРАКТИВ: Короткий вопрос к аудитории и призыв писать в комментарии (💬 ... 👇).
         8. ССЫЛКА: 🔗 Источник: <a href="...">Название</a>.
         
         ВАЖНО: Используй много эмодзи. Используй ТОЛЬКО HTML (<b>, <a>). Никакого Markdown (**).`
      : `Analyze as Vero AI. No intros. First line: Emoji + BOLD CAPS title. Add VERO AI SUMMARY, 3 points, and interactive "What do you think?" call to action. HTML only. Plenty of emojis.`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You output clean HTML with many emojis. No markdown stars." },
          { role: "user", content: `${prompt}\n\nТекст новости:\n${newsText}` }
        ],
        temperature: 0.65
      }, {
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        }
      });

      let result = response.data.choices[0].message.content;
      // Дополнительная зачистка на случай, если модель выдаст **
      result = result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      return result;
    } catch (error) {
      console.error('Groq Error:', error.response?.data || error.message);
      return `Ошибка генерации (Groq): ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    const summary = await this.generatePost(item.content || item.text || '', 'RU');
    return { 
      ...item, 
      text: summary, 
      link: item.link || item.url || '', 
      title: item.title || '', 
      priority: 'YELLOW' 
    };
  }
}
