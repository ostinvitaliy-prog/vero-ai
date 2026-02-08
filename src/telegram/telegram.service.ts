import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
  }

  async sendToChannel(channelKey: string, text: string, imageUrl?: string) {
    const channelId = process.env[channelKey];
    if (!channelId) return;

    try {
      if (imageUrl) {
        try {
          await this.bot.telegram.sendPhoto(channelId, imageUrl, {
            caption: text,
            parse_mode: 'HTML'
          });
        } catch (e) {
          await this.bot.telegram.sendMessage(channelId, text, { parse_mode: 'HTML' });
        }
      } else {
        await this.bot.telegram.sendMessage(channelId, text, { parse_mode: 'HTML' });
      }
    } catch (err) {
      console.error(`Error sending to ${channelKey}:`, err);
    }
  }
}
