import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ языке.
         ПРАВИЛА:
         1. Используй ТОЛЬКО HTML (<b>, <i>, <a>). Без Markdown (**).
         2. ЗАПРЕЩЕНО делать блок "Термины". Объясняй сложные слова в скобках сразу после них.
         3. Заголовок жирным <b>.
         4. В конце пиши только: "Может привести к:".`
      : `You are a Vero AI analyst. Summarize news in ENGLISH.
         RULES:
         1. Use ONLY HTML (<b>, <i>, <a>). No Markdown.
         2. DO NOT create a "Terms" block. Explain terms in brackets.
         3. Title bold <b>.
         4. End ONLY with: "May lead to:".`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "system", content: prompt }, { role: "user", content: newsText }],
      temperature: 0.5,
    });

    return completion.choices[0].message.content;
  }
}
