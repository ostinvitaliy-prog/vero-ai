import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface NewsItem {
  id?: number;
  title: string;
  link: string;
  content: string;
  pubDate: Date;
  source: string;
  imageUrl?: string;
  priority?: string;
  priorityReason?: string;
  postEn?: string;
  postRu?: string;
  isPosted?: boolean;
  createdAt?: Date;
}

export type Language = 'en' | 'ru';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ABACUSAI_API_KEY') || '';
    this.baseUrl = 'https://routellm.abacus.ai/v1';
    // Указываем конкретную модель
    this.model = 'deepseek-v3'; 
  }

  async analyzeNewsUnified(newsItem: NewsItem): Promise<{
    priority: 'RED' | 'YELLOW' | 'GREEN';
    priorityReason: string;
    postEn: string;
    postRu: string;
  }> {
    try {
      const prompt = `
        Analyze this crypto news:
        Title: ${newsItem.title}
        Content: ${newsItem.content}

        1. Determine priority:
           - RED: Critical market-moving news, major hacks, or massive regulatory shifts.
           - YELLOW: Important updates, price movements, or significant project news.
           - GREEN: General news, minor updates, or routine reports.

        2. Provide a brief reason for the priority.
        3. Create a short Telegram post in English.
        4. Create a short Telegram post in Russian.

        Format:
        - Use HTML tags (<b>, <i>, <a>).
        - Include a catchy headline.
        - 2-3 bullet points for key facts.
        - A brief "VERO Analysis" conclusion.
        - No hashtags.

        Return ONLY a JSON object:
        {
          "priority": "RED/YELLOW/GREEN",
          "priorityReason": "Brief explanation",
          "postEn": "HTML_CONTENT",
          "postRu": "HTML_CONTENT"
        }
      `;

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const rawContent = response.data.choices[0].message.content;
      const result = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

      return {
        priority: result.priority || 'GREEN',
        priorityReason: result.priorityReason || 'No reason provided',
        postEn: result.postEn,
        postRu: result.postRu,
      };
    } catch (error: any) {
      this.logger.error(`Error in unified analysis with ${this.model}`);
      if (error.response) {
        this.logger.error(`AI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      
      // Фоллбек на случай ошибки API
      return {
        priority: 'GREEN',
        priorityReason: 'AI Error Fallback',
        postEn: `<b>${newsItem.title}</b>\n\n${newsItem.content.substring(0, 200)}...`,
        postRu: `<b>${newsItem.title}</b>\n\n${newsItem.content.substring(0, 200)}...`,
      };
    }
  }

  formatTelegramPost(news: NewsItem, lang: Language): string {
    const content = lang === 'en' ? news.postEn : news.postRu;
    const emoji = news.priority === 'RED' ? '🔴' : news.priority === 'YELLOW' ? '🟡' : '🟢';
    return `${emoji} ${content}\n\n<a href="${news.link}">Source</a>`;
  }
}
