import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { Update } from 'telegraf';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly telegramService: TelegramService) {}

  // Webhook endpoint for Telegram (if you use webhooks)
  @Post('telegram/webhook')
  async handleTelegramWebhook(@Body() update: Update) {
    try {
      await this.telegramService.handleUpdate(update);
    } catch (error) {
      this.logger.error('Failed to handle Telegram update', error);
    }
  }
}
