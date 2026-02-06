import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { DatabaseModule } from '../database/database.module';
import { RssModule } from '../rss/rss.module';
import { AiModule } from '../ai/ai.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [DatabaseModule, RssModule, AiModule, TelegramModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
