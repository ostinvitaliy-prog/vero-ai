import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';

// Локальное объявление типа Update (минимальное)
type Update = any;

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  async handleUpdate(@Body() update: Update) {
    try {
      await this.telegramService.handleUpdate(update);
    } catch (error) {
      this.logger.error('Error handling Telegram update:', error);
    }
  }
}
