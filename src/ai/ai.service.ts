import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: 'https://routellm.abacus.ai/v1', // Твой RouteLLM
    });
  }

  async analyzeNewsUnified(item: NewsItem): Promise<any> {
    try {
      const prompt = `
        Analyze this crypto news and return JSON ONLY.
        Format:
        {
          "priority": "RED" | "YELLOW" | "GREEN",
          "priorityReason": "short reason",
          "postEn": "English telegram post text with emojis",
          "postRu": "Russian telegram post text with emojis"
        }

        News Title: ${item.title}
        Content: ${item.content}
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // или твой рабочий конфиг
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      // Логируем для проверки, что пришло не undefined
      this.logger.log(`AI Result for ${item.title.slice(0,30)}: ${result.priority}`);
      
      return result;
    } catch (e) {
      this.logger.error('AI Analysis failed', e);
      return {
        priority: 'GREEN',
        postEn: item.title,
        postRu: item.title
      };
    }
  }
}
