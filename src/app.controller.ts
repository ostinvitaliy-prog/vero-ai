import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { Update } from 'telegraf/typings/core/types/typegram';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  async handleUpdate(@Body() update: Update) {
    try {
      await this.telegramService.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error('Error handling Telegram update:', error);
    }
  }
}
