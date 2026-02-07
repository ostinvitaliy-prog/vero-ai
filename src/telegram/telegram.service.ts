import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { AiService, NewsItem, Language } from '../ai/ai.service';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Telegraf;
  private readonly channelEn: string;
  private readonly channelRu: string;

  private readonly fallbackImages = [
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0',
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
    'https://images.unsplash.com/photo-1621416894569-0f39ed31d247',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.bot = new Telegraf(token);
    this.channelEn = this.configService.get<string>('TELEGRAM_CHANNEL_EN') || '';
    this.channelRu = this.configService.get<string>('TELEGRAM_CHANNEL_RU') || '';

    this.bot.launch();
    this.logger.log('✅ Telegram bot launched');
  }

  async handleUpdate(update: any) {
    this.logger.log('Received update:', JSON.stringify(update));
  }

  async postNews(news: NewsItem) {
    const channels = [
      { id: this.channelEn, lang: 'en' as Language },
      { id: this.channelRu, lang: 'ru' as Language },
    ];

    for (const channel of channels) {
      try {
        const postHtml = this.aiService.formatTelegramPost(news, channel.lang);
        const imageUrl = await this.resolveNewsImage(news.imageUrl);

        await this.bot.telegram.sendPhoto(channel.id, imageUrl, {
          caption: postHtml,
          parse_mode: 'HTML',
        });

        this.logger.log(`✅ Posted to ${channel.id} (${channel.lang})`);
      } catch (error) {
        this.logger.error(`Error posting to ${channel.id}:`, error);
      }
    }
  }

  private async resolveNewsImage(imageUrl?: string): Promise<string> {
    if (!imageUrl) {
      return this.getRandomFallback();
    }

    try {
      const response = await axios.head(imageUrl, { timeout: 3000 });
      if (response.status === 200) {
        return imageUrl;
      }
    } catch (error) {
      this.logger.warn(`Image validation failed for ${imageUrl}`);
    }

    return this.getRandomFallback();
  }

  private getRandomFallback(): string {
    return this.fallbackImages[Math.floor(Math.random() * this.fallbackImages.length)];
  }
}
