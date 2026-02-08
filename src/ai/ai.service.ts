import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export type Language = 'en' | 'ru';

export interface NewsItem {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  source: string;
  imageUrl?: string;
  priority?: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason?: string;
  postEn?: string;
  postRu?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    // Берем ключ напрямую из env, если ConfigService еще не прогрузился
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      this.logger.error('❌ OPENAI_API_KEY is missing in environment variables!');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'missing', 
      baseURL: 'https://routellm.abacus.ai/v1',
    });
  }

  async analyzeNewsUnified(item: NewsItem): Promise<NewsItem> {
    try {
      const prompt = `
        Analyze this crypto news and return JSON ONLY.
        {
          "priority": "RED" | "YELLOW" | "GREEN",
          "priorityReason": "short reason",
          "postEn": "English telegram text with emojis",
          "postRu": "Russian telegram text with emojis"
        }

        Title: ${item.title}
        Content: ${item.content}
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const result = JSON.parse(content);

      item.priority = result.priority || 'GREEN';
      item.priorityReason = result.priorityReason || '';
      item.postEn = result.postEn || item.title;
      item.postRu = result.postRu || item.title;

      return item;

    } catch (e) {
      this.logger.error('AI error:', e);
      item.priority = 'GREEN';
      item.postEn = item.title;
      item.postRu = item.title;
      return item;
    }
  }

  formatTelegramPost(news: NewsItem, lang: Language): string {
    const text = lang === 'en' ? news.postEn : news.postRu;
    return `<b>${news.title}</b>\n\n${text}\n\n<a href="${news.link}">Source</a>`.trim();
  }
}
