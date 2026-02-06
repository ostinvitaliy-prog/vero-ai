import { Controller, Post, Body, Logger, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import type { Update } from 'telegraf/types';

@ApiTags('telegram')
@Controller('webhook')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private telegramService: TelegramService) {}

  @Post('telegram')
  @ApiOperation({ 
    summary: 'Telegram Bot Webhook',
    description: 'Receives updates from Telegram Bot API and processes user interactions'
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update format' })
  async handleWebhook(@Body() update: Update, @Headers('x-telegram-bot-api-secret-token') secretToken?: string) {
    try {
      this.logger.log('Received webhook update');
      this.logger.log(`Update content: ${JSON.stringify(update).substring(0, 300)}`);
      
      // Basic validation - you can add secret token validation here if needed
      if (!update) {
        throw new HttpException('Invalid update', HttpStatus.BAD_REQUEST);
      }

      this.logger.log('Calling telegramService.handleUpdate...');
      await this.telegramService.handleUpdate(update);
      this.logger.log('telegramService.handleUpdate completed');
      
      return { ok: true };
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
      this.logger.error('Error stack:', error.stack);
      // Return 200 to Telegram even on errors to prevent retry loops
      return { ok: false, error: error.message };
    }
  }
}
