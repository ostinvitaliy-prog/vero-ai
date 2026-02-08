import OpenAI from 'openai';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async generatePost(newsText: string, lang: 'RU' | 'EN') {
    const prompt = lang === 'RU' 
      ? `Ты — аналитик Vero AI. Сделай краткий пересказ новости на РУССКОМ.
         ПРАВИЛА:
         1. Используй только HTML (<b>, <i>, <a>). Никакого Markdown.
         2. НЕ делай блок "Термины". Объясняй сложные слова в скобках сразу после них.
         3. Заголовок жирным <b>.
         4. В конце пиши только: "Может привести к:".`
      : `You are Vero AI analyst. Summarize news in ENGLISH.
         RULES:
         1. Use only HTML (<b>, <i>, <a>). No Markdown.
         2. No "Terms" block. Explain terms in brackets.
         3. Bold title <b>.
         4. End with: "May lead to:".`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "system", content: prompt }, { role: "user", content: newsText }],
      temperature: 0.5,
    });

    return completion.choices[0].message.content;
  }
}
