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

  async generatePost(newsText: string) {
    if (!this.apiKey) return 'Ошибка: API ключ не найден';

    const prompt = `
      Ты — ведущий крипто-аналитик Vero AI. Оформи новость строго по шаблону.
      
      ШАБЛОН:
      1. ПЕРВАЯ СТРОКА: Выбери эмодзи (🔴 если крах/взлом/паника, 🟡 если важные анонсы/ETF/суды, 🟢 если позитив/рост) + <b>ЗАГОЛОВОК КАПСОМ</b> + 🚀
      
      2. ТЕКСТ: 2-3 коротких абзаца с фактами. Важные цифры (цены, проценты) выдели <b>жирным</b>. 
         ВНИМАНИЕ: Используй только те данные, которые есть в тексте. Не выдумывай текущие курсы!
      
      3. РАЗДЕЛИТЕЛЬ: --- (три тире)
      
      4. БЛОК АНАЛИТИКИ: 💡 <b>VERO AI SUMMARY:</b> объясни простыми словами, почему это важно для рынка.
      
      5. БЛОК ПРОГНОЗА: ⚠️ <b>МОЖЕТ ПРИВЕСТИ К:</b> дай 2-3 четких пункта.
      
      6. РАЗДЕЛИТЕЛЬ: ---
      
      7. ИНТЕРАКТИВ: 💬 <b>А что об этом думаете вы? Пишите в комментариях!</b> 👇
      
      8. ХЭШТЕГИ: 3-5 штук (например, #BTC #Крипто #Новости)
      
      ПРАВИЛА: Используй ТОЛЬКО HTML (<b>, <a>). Никаких Markdown звездочек (**). Между всеми блоками делай двойной перенос строки.
    `;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a professional news editor. Output ONLY clean HTML. Do not invent information. Follow the emoji priority logic." },
          { role: "user", content: `ТЕКСТ ДЛЯ ОБРАБОТКИ:\n${newsText}\n\nИНСТРУКЦИЯ:\n${prompt}` }
        ],
        temperature: 0 // Полное отсутствие галлюцинаций
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
    // Ищем картинку в разных стандартах RSS (enclosure, media:content, meta)
    const imageUrl = item.image || 
                     item.enclosure?.url || 
                     (item['media:content'] ? item['media:content']['@_url'] : '') || 
                     item.meta?.image || '';

    const fullText = `${item.title}\n\n${item.content || item.text || ''}`;
    const processedText = await this.generatePost(fullText);

    // Определяем приоритет для объекта (базово ставим YELLOW, ИИ сам поставит нужный эмодзи в текст)
    return { 
      ...item, 
      text: processedText, 
      link: item.link || item.url || '', 
      title: item.title || '',
      image: imageUrl,
      priority: 'YELLOW' 
    };
  }
}
