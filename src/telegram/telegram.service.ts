import { Telegraf } from 'telegraf';

export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
  }

  async sendToChannel(channelId: string, text: string, imageUrl?: string) {
    try {
      if (imageUrl) {
        try {
          await this.bot.telegram.sendPhoto(channelId, imageUrl, {
            caption: text,
            parse_mode: 'HTML'
          });
        } catch (e) {
          console.error("Image error, sending text only");
          await this.bot.telegram.sendMessage(channelId, text, { parse_mode: 'HTML' });
        }
      } else {
        await this.bot.telegram.sendMessage(channelId, text, { parse_mode: 'HTML' });
      }
    } catch (err) {
      console.error("Telegram send error:", err);
    }
  }
}
