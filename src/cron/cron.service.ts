import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService, NewsItem } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class CronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronService.name);
  private isScanning = false;

  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly db: DatabaseService,
    private readonly telegramService: TelegramService,
  ) {
    this.logger.log('✅ CronService initialized');
  }

  // При старте сразу пытаемся найти и отправить одну важную новость
  async onApplicationBootstrap() {
    this.logger.log('🚀 onApplicationBootstrap: initial scan & maybe post one...');
    await this.scanAndPostOne();
  }

  // Каждый час — одна самая важная новость
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyScan() {
    this.logger.log('⏰ Hourly cron triggered');
    await this.scanAndPostOne();
  }

  // Главный метод, который дергаем и из main.ts, и из крона, и при старте
  async scanAndPostOne() {
    if (this.isScanning) {
      this.logger.warn('⚠️ Scan already in progress, skipping...');
      return;
    }

    this.isScanning = true;

    try {
      this.logger.log('🔍 Starting news scan (for one top news)...');

      // Берём все новости из RSS
      const items: NewsItem[] = await this.rssService.fetchAllNews();
      this.logger.log(`📰 Fetched ${items.length} news items from RSS`);

      if (!items.length) {
        this.logger.log('📭 No items from RSS.');
        return;
      }

      const scored: {
        item: NewsItem;
        priority: 'RED' | 'YELLOW' | 'GREEN';
        priorityReason?: string | null;
      }[] = [];

      for (const item of items) {
        // Проверяем: уже отправляли или нет
        const existingHashes = await this.db.getAllNewsHashes();
        const alreadySent = existingHashes.includes(
          // хэш линка считается внутри saveNews/markAsPosted,
          // но здесь мы решаем, анализировать ли новость
          // (оптимизацию можно будет сделать потом)
          // пока просто проверим по массиву
          // однако это неэффективно, но надёжно
          // если нужно, можно вынести хэш в helper
          // но сейчас главное — чтобы работало
          // оставляем эту логику как есть
          // (если будешь против — сделаем оптимизацию отдельно)
          // временно: просто пропустим проверку и отдадим всё на saveNews/markAsPosted
          // но тогда будет повторный AI-анализ уже отправленных
          // => лучше использовать getAllNewsHashes один раз
          // см. улучшенную версию ниже
          '',
        );
        // на самом деле сделаем правильно: вынесем hashes вне цикла
        // этот кусок сейчас перепишем ниже
        break;
      }

      // ⚠️ ПЕРЕПИСЫВАЕМ ЛОГИКУ С ХЭШАМИ КОРРЕКТНО

      // 1. Получаем все уже отправленные хэши
      const sentHashes = await this.db.getAllNewsHashes();
      this.logger.log(`📊 Already sent news count: ${sentHashes.length}`);

      const candidates: {
        item: NewsItem;
        priority: 'RED' | 'YELLOW' | 'GREEN';
        priorityReason?: string | null;
      }[] = [];

      for (const item of items) {
        // Считаем хэш ссылки так же, как в DatabaseService.saveNews
        const crypto = await import('crypto-js');
        const newsHash = crypto.SHA256(item.link).toString();

        if (sentHashes.includes(newsHash)) {
          continue; // уже отправляли — пропускаем
        }

        this.logger.log(`🤖 Analyzing: ${item.title.slice(0, 80)}...`);
        const analysis = await this.aiService.analyzeNewsUnified(item);

        // Проставляем приоритет в объекте, чтобы дальше не потерять
        item.priority = analysis.priority;
        item.priorityReason = analysis.priorityReason;

        // Сохраняем в БД (хэш + приоритет)
        await this.db.saveNews(item);

        candidates.push({
          item,
          priority: analysis.priority,
          priorityReason: analysis.priorityReason,
        });
      }

      if (!candidates.length) {
        this.logger.log('📭 No new unsent news after filtering by hashes.');
        return;
      }

      // Выбираем лучшую по приоритету: RED > YELLOW > GREEN (GREEN не постим)
      const priorityRank: Record<string, number> = {
        RED: 3,
        YELLOW: 2,
        GREEN: 1,
      };

      candidates.sort((a, b) => {
        return priorityRank[b.priority] - priorityRank[a.priority];
      });

      const best = candidates[0];

      if (!best || (best.priority !== 'RED' && best.priority !== 'YELLOW')) {
        this.logger.log(
          `📭 Best news priority is ${best?.priority || 'NONE'}, nothing to post.`,
        );
        return;
      }
