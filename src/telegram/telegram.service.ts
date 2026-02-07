import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { DatabaseService } from '../database/database.service';
import { AiService, NewsItem, Language } from '../ai/ai.service';
import { RssService } from '../rss/rss.service';
import { getTranslation } from '../common/translations';
import { validateImageUrl } from '../common/image-validator';

// ... остальной код без изменений ...

async handleUpdate(update: Update) {
  if (!this.bot) {
    this.logger.warn('Bot not initialized when handling update');
    return;
  }
  // @ts-ignore
  await this.bot.handleUpdate(update);
}
