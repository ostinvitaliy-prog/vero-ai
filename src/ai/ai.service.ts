import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    // Используем ABACUSAI_API_KEY из твоих настроек Render
    this.apiKey = this.configService.get<string>('ABACUSAI_API_KEY');
    // Прямая ссылка на RouteLLM API
    this.baseUrl = 'https://routellm.abacus.ai/v1';
    // Используем эффективную модель
    this.model = 'google/gemini-2.0-flash-001';
  }

  async analyzeNewsUnified(title: string, content: string): Promise<{
    priority: 'RED' | 'YELLOW' | 'GREEN';
    postEn: string;
    postRu: string;
  }> {
    try {
      const prompt = `
        Analyze this crypto news:
        Title: ${title}
        Content: ${content}

        1. Determine priority:
           - RED: Critical market-moving news, major hacks, or massive regulatory shifts.
           - YELLOW: Important updates, price movements, or significant project news.
           - GREEN: General news, minor updates, or routine reports.

        2. Create a short Telegram post in English.
        3. Create a short Telegram post in Russian.

        Format:
        - Use HTML tags (<b>, <i>, <a>).
        - Include a catchy headline.
        - 2-3 bullet points for key facts.
        - A brief "VERO Analysis" conclusion.
        - No hashtags.

        Return ONLY a JSON object:
        {
          "priority": "RED/YELLOW/GREEN",
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

      const result = JSON.parse(response.data.choices[0].message.content);
      return {
        priority: result.priority || 'GREEN',
        postEn: result.postEn,
        postRu: result.postRu,
      };
    } catch (error) {
      this.logger.error(`Error in unified analysis: ${error.message}`);
      if (error.response) {
        this.logger.error(`AI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`AI API error: ${error.response?.status || 500}`);
    }
  }

  formatTelegramPost(content: string, sourceUrl: string, priority: string): string {
    const emoji = priority === 'RED' ? '🔴' : priority === 'YELLOW' ? '🟡' : '🟢';
    return `${emoji} ${content}\n\n<a href="${sourceUrl}">Source</a>`;
  }
}
