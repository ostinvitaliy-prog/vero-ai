import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CronService } from './cron/cron.service';
import { TelegramService } from './telegram/telegram.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cronService: CronService,
    private readonly telegramService: TelegramService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('admin/scan-now')
  async scanNow() {
    await this.cronService.manualScan();
    return { success: true, message: 'News scan triggered' };
  }

  @Post('admin/broadcast-now')
  async broadcastNow() {
    await this.cronService.manualBroadcast();
    return { success: true, message: 'News broadcast triggered' };
  }

  @Post('admin/post-welcome')
  async postWelcome() {
    await this.telegramService.postWelcomeToChannels();
    return { success: true, message: 'Welcome posts sent to both channels' };
  }
}
