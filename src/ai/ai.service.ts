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
    this.model = 'google/gemini-2.0-flash-001';
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
            'Authorization
