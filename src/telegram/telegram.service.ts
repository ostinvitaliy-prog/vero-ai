import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { DatabaseService } from '../database/database.service';
import { AiService, NewsItem, Language } from '../ai/ai.service';
import { RssService } from '../rss/rss.service';
import { getTranslation } from '../common/translations';
import { validateImageUrl } from '../common/image-validator';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private aiService: AiService,
    private rssService: RssService
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
    this.botToken = token;
  }

  async onModuleInit() {
    this.bot = new Telegraf(this.botToken);
    this.setupHandlers();
    this.aiService.setTelegramBot(this.bot);
    this.logger.log('✓ Telegram bot initialized');
  }

  private setupHandlers() {
    this.bot.command('start', async (ctx) => {
      await this.handleStart(ctx);
    });

    this.bot.action(/^lang:(.+)$/, async (ctx) => {
      const lang = (ctx as any).match[1] as Language;
      await this.handleLanguageSelection(ctx, lang);
    });

    this.bot.catch((err, ctx) => {
      this.logger.error(`Telegram bot error for ${ctx.updateType}:`, err);
    });
  }

  private async handleStart(ctx: Context) {
    if (!ctx.from) {
      this.logger.warn('ctx.from is undefined in handleStart');
      return;
    }
    try {
      const userId = BigInt(ctx.from.id);
      let user = await this.databaseService.getUser(userId);

      if (!user) {
        const detectedLang: Language = ctx.from.language_code === 'ru' ? 'ru' : 'en';
        user = await this.databaseService.createUser(userId, detectedLang);
      }

      const totalUsers = await this.databaseService.sent_news.count();
      const lang = user.lang as Language;

      const welcomeText = getTranslation(lang, 'welcomeMsg1')
        .replace('{totalSubscribers}', totalUsers.toString());

      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(getTranslation(lang, 'settings'), 'settings')]
        ])
      });
    } catch (error) {
      this.logger.error('Error in handleStart:', error);
    }
  }

  private async handleLanguageSelection(ctx: Context, lang: Language) {
    if (!ctx.from) {
      this.logger.warn('ctx.from is undefined in handleLanguageSelection');
      return;
    }
    try {
      const userId = BigInt(ctx.from.id);
      await this.databaseService.updateUserLanguage(userId, lang);
      await ctx.answerCbQuery(getTranslation(lang, 'langUpdated'));
    } catch (error) {
      this.logger.error('Error in handleLanguageSelection:', error);
    }
  }

  async broadcastNews(news: NewsItem) {
    const channels = [
      { id: this.configService.get('TELEGRAM_CHANNEL_EN'), lang: 'en' as Language },
      { id: this.configService.get('TELEGRAM_CHANNEL_RU'), lang: 'ru' as Language }
    ];

    let imageUrl = news.imageUrl;
    if (imageUrl && !(await validateImageUrl(imageUrl))) {
      imageUrl = undefined;
    }

    for (const channel of channels) {
      if (!channel.id) continue;

      try {
        const postHtml = this.aiService.formatTelegramPost(news, channel.lang);

        if (imageUrl) {
          await this.bot.telegram.sendPhoto(channel.id, imageUrl, {
            caption: postHtml,
            parse_mode: 'HTML'
          });
        } else {
          await this.bot.telegram.sendMessage(channel.id, postHtml, {
            parse_mode: 'HTML',
            disable_web_page_preview: false
          });
        }
      } catch (error) {
        this.logger.error(`Failed to broadcast to ${channel.lang}:`, error);
      }
    }
  }

  async notifyAdmin(message: string) {
    const adminId = this.configService.get('ADMIN_TELEGRAM_ID');
    if (adminId) {
      try {
        await this.bot.telegram.sendMessage(adminId, `⚠️ <b>ADMIN</b>\n\n${message}`, {
          parse_mode: 'HTML'
        });
      } catch (e) {
        this.logger.error('Failed to send admin notification');
      }
    }
  }
}
