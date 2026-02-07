import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram/telegram.service';

// Локальное объявление типа Update (минимальное)
type Update = any;

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('telegram/webhook')
  async handleTelegramWebhook(@Body() update: Update) {
    try {
      await this.telegramService.handleUpdate(update);
    } catch (error) {
      this.logger.error('Failed to handle Telegram update', error);
    }
  }
}
