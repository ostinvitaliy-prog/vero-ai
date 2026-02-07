import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { CronService } from './cron/cron.service';
import { RssService } from './rss/rss.service';
import { TelegramService } from './telegram/telegram.service';
import { AiService } from './ai/ai.service';
import { DatabaseService } from './database/database.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [
    CronService,
    RssService,
    TelegramService,
    AiService,
    DatabaseService
  ],
})
export class AppModule {}
