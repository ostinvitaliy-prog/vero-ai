import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
import { NewsItem } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private newsBuffer: NewsItem[] = [];

  constructor(
    private readonly rssService: RssService,
    private readonly aiService: AiService,
    private readonly databaseService: DatabaseService,
    private readonly telegramService: TelegramService,
  ) {
    this.logger.log('✅ CronService initialized');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scanNews() {
    this.logger.log('🔍 Starting hourly news scan...');
    try {
      const allNews = await this.rssService.fetchAllNews();
      this.logger.log(`📰 Fetched ${allNews.length} news items from RSS`);

      const existingHashes = await this.databaseService.getAllNewsHashes();
      const newNews = allNews.filter((item) => !existingHashes.includes(item.link));

      this.logger.log(`🆕 Found ${newNews.length} new items`);

      for (const newsItem of newNews) {
        try {
          this.logger.log(`🤖 Analyzing: ${newsItem.title.substring(0, 60)}...`);

          const analysisResult = await this.aiService.analyzeNewsUnified(newsItem);

          const enrichedNews: NewsItem = {
            ...newsItem,
            priority: analysisResult.priority,
            priorityReason: analysisResult.priorityReason,
            postEn: analysisResult.postEn,
            postRu: analysisResult.postRu,
          };

          await this.databaseService.saveNews(enrichedNews);

          if (enrichedNews.priority === 'RED' || enrichedNews.priority === 'YELLOW') {
            this.newsBuffer.push(enrichedNews);
            this.logger.log(`✅ Added to buffer: ${enrichedNews.priority} - ${enrichedNews.title.substring(0, 40)}...`);
          }
        } catch (error) {
          this.logger.error('Error analyzing news item:');
          this.logger.error(error);
        }
      }

      this.logger.log(`✅ Scan complete. Buffer size: ${this.newsBuffer.length}`);
    } catch (error) {
      this.logger.error('Error in scanNews:');
      this.logger.error(error);
    }
  }

  @Cron('0 9,13,17,21 * * *')
  async postNews() {
    this.logger.log('📤 Starting scheduled post...');
    try {
      if (this.newsBuffer.length === 0) {
        this.logger.warn('⚠️ Buffer is empty, nothing to post');
        return;
      }

      const redNews = this.newsBuffer.filter((n) => n.priority === 'RED');
      const yellowNews = this.newsBuffer.filter((n) => n.priority === 'YELLOW');

      let selectedNews: NewsItem | null = null;

      if (redNews.length > 0) {
        selectedNews = redNews[0];
      } else if (yellowNews.length > 0) {
        selectedNews = yellowNews[0];
      }

      if (!selectedNews) {
        this.logger.warn('⚠️ No RED or YELLOW news in buffer');
        return;
      }

      this.logger.log(`📢 Posting: ${selectedNews.title.substring(0, 60)}...`);

      await this.telegramService.postNews(selectedNews);

      await this.databaseService.markAsPosted(selectedNews.link);

      this.newsBuffer = this.newsBuffer.filter((n) => n.link !== selectedNews.link);

      this.logger.log(`✅ Posted successfully. Buffer size: ${this.newsBuffer.length}`);
    } catch (error) {
      this.logger.error('Error in postNews:');
      this.logger.error(error);
    }
  }
}
