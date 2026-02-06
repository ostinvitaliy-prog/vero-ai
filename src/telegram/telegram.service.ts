import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { Update } from 'telegraf/types';
import { DatabaseService } from '../database/database.service';
import { AiService, NewsItem } from '../ai/ai.service';
import { RssService } from '../rss/rss.service';
import { getTranslation, Language } from '../common/translations';
import { resolveNewsImage } from '../common/image-validator';

interface SessionContext extends Context {
  session?: { awaitingLanguage?: boolean };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;
  private newsCache: Map<string, any> = new Map();

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private aiService: AiService,
    private rssService: RssService
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured in environment variables');
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

    this.bot.action('hide_menu', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
      } catch (error) {
        this.logger.error('Error hiding menu:', error);
      }
    });

    this.bot.on('callback_query', async (ctx) => {
      await ctx.answerCbQuery();
    });

    this.bot.catch((err, ctx) => {
      this.logger.error(`Telegram bot error for ${ctx.updateType}:`, err);
    });
  }

  private async handleStart(ctx: Context) {
    try {
      const userId = BigInt(ctx.from.id);
      let user = await this.databaseService.getUser(userId);

      if (!user) {
        const detectedLang: Language = ctx.from.language_code === 'ru' ? 'ru' : 'en';
        user = await this.databaseService.createUser(userId, detectedLang);
        this.logger.log(`New user registered: ${userId} (${detectedLang})`);
      }

      const totalUsers = await this.databaseService.users.count();
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
    try {
      const userId = BigInt(ctx.from.id);
      await this.databaseService.updateUserLanguage(userId, lang);
      
      await ctx.answerCbQuery(getTranslation(lang, 'langUpdated'));
      await ctx.editMessageText(getTranslation(lang, 'welcomeMsg1'), {
        parse_mode: 'HTML'
      });
    } catch (error) {
      this.logger.error('Error in handleLanguageSelection:', error);
    }
  }

  async broadcastNews(news: NewsItem) {
    const channels = [
      { id: this.configService.get('TELEGRAM_CHANNEL_EN'), lang: 'en' as Language },
      { id: this.configService.get('TELEGRAM_CHANNEL_RU'), lang: 'ru' as Language }
    ];

    const imageUrl = await resolveNewsImage(news.imageUrl);

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
        
        this.logger.log(`News broadcasted to ${channel.lang} channel`);
      } catch (error) {
        this.logger.error(`Failed to broadcast to ${channel.lang} channel:`, error);
      }
    }
  }

  async notifyAdmin(message: string) {
    const adminId = this.configService.get('ADMIN_TELEGRAM_ID');
    if (adminId) {
      try {
        await this.bot.telegram.sendMessage(adminId, `⚠️ <b>ADMIN NOTIFICATION</b>\n\n${message}`, {
          parse_mode: 'HTML'
        });
      } catch (e) {
        this.logger.error('Failed to send admin notification');
      }
    }
  }
}
