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

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'API Key error';

    const prompt = lang === 'RU' 
      ? `Ты — редактор Vero AI. Сделай СТИЛЬНЫЙ и КРАТКИЙ пост.
         СТРУКТУРА (строго до 900 символов):
         1. 🟢/🟡/🔴 <b>ЗАГОЛОВОК КАПСОМ</b> 🚀
         2. 📝 <b>СУТЬ:</b> (2-3 коротких предложения с эмодзи в тексте)
         3. 💡 <b>Vero AI Summary:</b> (главный вывод)
         4. 📉 <b>Прогноз:</b>
            • Пункт 1
            • Пункт 2
         5. #BTC #Крипто #Новости`
      : `You are Vero AI Editor. Create a STYLISH and CONCISE post in ENGLISH.
         STRUCTURE (strict under 900 chars):
         1. 🟢/🟡/🔴 <b>HEADER IN CAPS</b> 🚀
         2. 📝 <b>CORE:</b> (2-3 short sentences with emojis)
         3. 💡 <b>Vero AI Summary:</b> (key takeaway)
         4. 📉 <b>Impact:</b>
            • Point 1
            • Point 2
         5. #Crypto #BTC #News`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are a crypto journalist. Use HTML (<b>). Max 900 chars. Language: ${lang}` },
          { role: "user", content: `SOURCE TEXT:\n${newsText}\n\nINSTRUCTION:\n${prompt}` }
        ],
        temperature: 0.2
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data.choices[0].message.content.replace(/\*\*/g, ''); 
    } catch (error) {
      return `AI Error: ${error.message}`;
    }
  }
}
