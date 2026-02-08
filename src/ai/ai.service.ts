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
    if (!this.apiKey) return 'Ошибка: API ключ не настроен';

    const prompt = `
      Ты — новостной редактор. Твоя задача — строго пересказать новость.
      
      ПРАВИЛА:
      1. ПЕРВАЯ СТРОКА: Эмодзи (🟡) и заголовок жирным КАПСОМ: <b>ЗАГОЛОВОК</b>
      2. ТЕКСТ: 2-3 коротких абзаца. Используй ТОЛЬКО факты из текста ниже. Если в тексте нет цены — НЕ ПИШИ ЕЁ.
      3. ОТСТУПЫ: Обязательно используй двойной перенос строки между блоками.
      4. SUMMARY: Начни с "💡 <b>VERO AI SUMMARY:</b>" и напиши суть новости простым языком.
      5. ПРОГНОЗ: Начни с "⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b>" и дай 2-3 пункта.
      6. ИНТЕРАКТИВ: В конце добавь "💬 <b>А что об этом думаете вы? Пишите в комментариях!</b> 👇"
      7. ССЫЛКА: В самом конце "🔗 Источник: <a href='...'>Читать в источнике</a>"
      
      ЗАПРЕТЫ: Никаких ** (звездочек). Только HTML-теги <b> и <a>. Не выдумывай новости!
    `;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional editor. You use only HTML (<b>, <a>). You never invent facts or dates. You follow formatting strictly." },
          { role: "user", content: `ТЕКСТ НОВОСТИ:\n${newsText}\n\nИНСТРУКЦИЯ:\n${prompt}` }
        ],
        temperature: 0.1 // МАКСИМАЛЬНАЯ ТОЧНОСТЬ, НИКАКИХ ГАЛЛЮЦИНАЦИЙ
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });

      let result = response.data.choices[0].message.content;
      return result.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); 
    } catch (error) {
      return `Ошибка генерации: ${error.message}`;
    }
  }

  async analyzeNewsUnified(item: any): Promise<NewsItem> {
    // Ищем картинку везде, где она может быть в RSS
    const imageUrl = item.image || item.enclosure?.url || item['media:content']?.['@_url'] || '';
    
    // Передаем заголовок + контент, чтобы у ИИ было больше данных и он не галлюцинировал
    const fullText = `${item.title}\n\n${item.content || item.text || ''}`;
    const summary = await this.generatePost(fullText, 'RU');
    
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
