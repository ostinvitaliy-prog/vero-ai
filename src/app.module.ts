import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiService } from './ai/ai.service';
import { TelegramService } from './telegram/telegram.service';
import { DatabaseService } from './database/database.service';
import { RssService } from './rss/rss.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    AiService, 
    TelegramService, 
    DatabaseService, 
    RssService
  ],
})
export class AppModule {}
