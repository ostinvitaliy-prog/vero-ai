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
      const lang = ctx.match[1] as Language;
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
      this.logger.error(\`Telegram bot error for \${ctx.updateType}:\`, err);
    });
  }

  private async handleStart(ctx: Context) {
    try {
      const userId = BigInt(ctx.from.id);
      let user = await this.databaseService.getUser(userId);

      if (!user) {
        const detectedLang: Language = ctx.from.language_code === 'ru' ? 'ru' : 'en';
        user = await this.databaseService.createUser(userId, detectedLang);
        this.logger.log(\`New user registered: \${userId} (\${detectedLang})\`);
      }

      const totalUsers = await this.databaseService.users.count();
      const lang = user.lang as Language;

      const welcomeText = getTranslation(lang, 'welcomeMsg1')
        .replace('{totalSubscribers}', totalUsers.toString());

      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(getTranslation(lang, 'settings'), 'settings')],
        ])
      });
    } catch (error) {
      this.logger.error('Error in handleStart:', error);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  private async handleLanguageSelection(ctx: any, lang: Language) {
    try {
      const userId = BigInt(ctx.from.id);
      await this.databaseService.updateUserLanguage(userId, lang);

      await ctx.answerCbQuery(getTranslation(lang, 'languageChanged'));
      await ctx.editMessageText(
        getTranslation(lang, 'languageChanged'),
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      this.logger.error('Error in handleLanguageSelection:', error);
    }
  }

  async handleUpdate(update: Update) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      this.logger.error('Error handling update:', error);
      throw error;
    }
  }

  async postToChannels(newsItem: NewsItem, priority: string, analyses: Map<string, any>) {
    const channels = {
      en: '@vero_crypto_news',
      ru: '@vero_crypto_news_ru'
    };

    const imageUrl = await resolveNewsImage(newsItem.image);

    for (const [lang, channelId] of Object.entries(channels)) {
      try {
        const analysis = analyses.get(lang);
        if (!analysis) {
          this.logger.warn(\`No analysis for language: \${lang}\`);
          continue;
        }

        const postText = this.aiService.formatTelegramPost(analysis, lang as Language, imageUrl);

        await this.bot.telegram.sendPhoto(channelId, imageUrl, {
          caption: postText,
          parse_mode: 'HTML',
        });

        this.logger.log(\`✓ Posted to \${channelId} (\${lang.toUpperCase()})\`);
      } catch (error) {
        this.logger.error(\`Failed to post to \${channelId}:\`, error);

        try {
          const analysis = analyses.get(lang);
          const postText = this.aiService.formatTelegramPost(analysis, lang as Language);
          await this.bot.telegram.sendMessage(channelId, postText, { parse_mode: 'HTML' });
          this.logger.log(\`✓ Posted to \${channelId} without image (fallback)\`);
        } catch (fallbackError) {
          this.logger.error(\`Failed fallback post to \${channelId}:\`, fallbackError);
        }
      }
    }
  }

  async postWelcomeToChannels() {
    const channels = {
      en: '@vero_crypto_news',
      ru: '@vero_crypto_news_ru'
    };

    const messages = {
      en: '🚀 <b>VERO AI is now live!</b>\n\nWelcome to premium crypto news with AI analysis.\n\nYou will receive the most important crypto news every hour, analyzed by our AI.',
      ru: '🚀 <b>VERO AI теперь в эфире!</b>\n\nДобро пожаловать в премиальные крипто-новости с AI-анализом.\n\nВы будете получать самые важные крипто-новости каждый час с анализом нашего AI.'
    };

    for (const [lang, channelId] of Object.entries(channels)) {
      try {
        await this.bot.telegram.sendMessage(channelId, messages[lang], { parse_mode: 'HTML' });
        this.logger.log(\`✓ Welcome message sent to \${channelId}\`);
      } catch (error) {
        this.logger.error(\`Failed to send welcome to \${channelId}:\`, error);
      }
    }
  }

  getBot(): Telegraf {
    return this.bot;
  }
}
