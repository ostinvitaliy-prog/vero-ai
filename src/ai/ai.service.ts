import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
}

export type Language = 'ru' | 'en';

interface AnalysisResult {
  priority: 'RED' | 'YELLOW' | 'GREEN';
  priorityReason: string;
  en: {
    title: string;
    body: string;
    aiSimple: string;
    aiLeads: string;
  };
  ru: {
    title: string;
    body: string;
    aiSimple: string;
    aiLeads: string;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private lastCreditWarningTime: number = 0;
  private readonly CREDIT_WARNING_COOLDOWN = 60 * 60 * 1000;
  private telegramBot: any = null;
  private readonly ADMIN_ID: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = 'https://routellm.abacus.ai/v1/chat/completions';
    const apiKey = this.configService.get<string>('ABACUSAI_API_KEY');
    if (!apiKey) {
      throw new Error('ABACUSAI_API_KEY is not configured');
    }
    this.apiKey = apiKey;
    this.ADMIN_ID = this.configService.get<string>('ADMIN_TELEGRAM_ID') || '497424575';
  }

  setTelegramBot(bot: any) {
    this.telegramBot = bot;
    this.logger.log('Telegram bot instance set for notifications');
  }

  private async notifyAdminAboutCredits(error: string) {
    try {
      const now = Date.now();
      if (now - this.lastCreditWarningTime < this.CREDIT_WARNING_COOLDOWN) {
        return;
      }

      if (!this.telegramBot) {
        this.logger.warn('Telegram bot not set, cannot send admin notification');
        return;
      }

      const message = `🚨 <b>VERO Bot Alert</b>\n\n` +
        `⚠️ <b>AI Credits Issue Detected</b>\n\n` +
        `Error: ${error}\n\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Please check your Abacus.AI credits balance.`;

      await this.telegramBot.telegram.sendMessage(this.ADMIN_ID, message, { parse_mode: 'HTML' });
      this.lastCreditWarningTime = now;
      this.logger.log('Admin notified about credit issue');
    } catch (err) {
      this.logger.error('Failed to notify admin:', err);
    }
  }

  async analyzeNewsUnified(newsItem: NewsItem): Promise<AnalysisResult> {
    const prompt = `You are a crypto news analyst for VERO AI. Analyze this news and create Telegram posts in BOTH English and Russian.

NEWS:
Title: ${newsItem.title}
Description: ${newsItem.description}
Link: ${newsItem.link}

TASK:
1. Determine priority level:
   - RED: BTC/ETH ±10%, hacks >$50M, SEC/regulations, exchange bankruptcies
   - YELLOW: Altcoins ±15%, partnerships, listings, whale moves >$50M
   - GREEN: Everything else

2. Create Telegram post for EACH language (EN and RU) with this EXACT format:

**Title**: 5-7 words, bold
**Body**: 4-6 sentences with facts and context. IMPORTANT: Explain technical terms IN BRACKETS directly in text, like "ETF (exchange traded fund)" or "DeFi (decentralized finance)".
**VERO AI block**:
  📌 Простым языком: 1-2 sentences explaining simply
  📈 Может привести к: 1-2 sentences about consequences (use EXACTLY this phrase "Может привести к" in Russian, "May lead to" in English)

CRITICAL RULES:
- NO separate "Terms:" block
- Explain terms IN BRACKETS inside the text
- Use HTML tags: <b>bold</b>, <i>italic</i>
- Russian post must be in Russian, English post in English
- Use emoji for priority: 🔴 RED, 🟡 YELLOW, 🟢 GREEN

Return ONLY valid JSON (no markdown, no extra text):
{
  "priority": "RED" | "YELLOW" | "GREEN",
  "priorityReason": "brief reason",
  "en": {
    "title": "...",
    "body": "...",
    "aiSimple": "...",
    "aiLeads": "..."
  },
  "ru": {
    "title": "...",
    "body": "...",
    "aiSimple": "...",
    "aiLeads": "..."
  }
}`;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional crypto news analyst. Always return valid JSON only, no markdown formatting.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`AI API error: ${response.status} - ${errorText}`);

        if (response.status === 402 || response.status === 429 || errorText.includes('credit')) {
          await this.notifyAdminAboutCredits(errorText);
        }

        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      let result: AnalysisResult;
      try {
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(cleanContent);
      } catch (parseError) {
        this.logger.error('Failed to parse AI response:', content);
        throw new Error('Invalid JSON from AI');
      }

      if (!result.priority || !result.en || !result.ru) {
        throw new Error('Invalid response structure from AI');
      }

      this.logger.log(`✓ Unified analysis complete: ${result.priority} - ${newsItem.title.substring(0, 50)}`);
      return result;

    } catch (error) {
      this.logger.error('Error in unified analysis:', error);
      throw error;
    }
  }

  formatTelegramPost(newsItem: NewsItem, lang: Language): string {
    const analysis = (newsItem as any).analysis as AnalysisResult;
    if (!analysis) {
      throw new Error('News item must have analysis data');
    }

    const data = lang === 'en' ? analysis.en : analysis.ru;
    const priorityEmoji = analysis.priority === 'RED' ? '🔴' : analysis.priority === 'YELLOW' ? '🟡' : '🟢';

    let post = `${priorityEmoji} <b>${data.title}</b>\n\n`;
    post += `${data.body}\n\n`;
    post += `💎 <b>VERO AI:</b>\n`;
    post += `<b>📌 ${lang === 'ru' ? 'Простым языком' : 'In simple terms'}:</b> ${data.aiSimple}\n`;
    post += `<b>📈 ${lang === 'ru' ? 'Может привести к' : 'May lead to'}:</b> ${data.aiLeads}`;

    return post;
  }

  async determinePriority(newsItem: NewsItem): Promise<{ priority: string; reason: string }> {
    const result = await this.analyzeNewsUnified(newsItem);
    return {
      priority: result.priority,
      reason: result.priorityReason
    };
  }

  async generateAnalysis(newsItem: NewsItem, lang: Language): Promise<string> {
    const result = await this.analyzeNewsUnified(newsItem);
    return this.formatTelegramPost({ ...newsItem, analysis: result } as any, lang);
  }
}
