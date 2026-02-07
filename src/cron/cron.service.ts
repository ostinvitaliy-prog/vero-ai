import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { RssService } from '../rss/rss.service';
import { AiService } from '../ai/ai.service';
import { TelegramService } from '../telegram/telegram.service';
import { NewsItem } from '../ai/ai.service';

interface BufferedNews {
  newsItem: NewsItem;
  priority: string;
  priorityReason: string;
  analysisResult: any;
  scannedAt: Date;
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private isScanning = false;
  private isBroadcasting = false;
  private newsBuffer: BufferedNews[] = [];

  constructor(
    private databaseService: DatabaseService,
    private rssService: RssService,
    private aiService: AiService,
    private telegramService: TelegramService
  ) {
    this.logger.log('✅ CronService initialized');
  }

  @Cron('*/15 * * * *')
  async scanNews() {
    if (this.isScanning) {
      this.logger.log('⏭️ Previous scan still processing, skipping...');
      return;
    }

    this.isScanning = true;
    this.logger.log('🔍 Starting 15-minute news scan...');

    try {
      const latestNews = await this.rssService.getNewsForPosting();
      this.logger.log(`📰 Found ${latestNews.length} news items to analyze`);

      for (const newsItem of latestNews) {
        try {
          const newsHash = this.rssService.generateNewsHash(newsItem);

          const alreadyInBuffer = this.newsBuffer.find(n =>
            this.rssService.generateNewsHash(n.newsItem) === newsHash
          );
          if (alreadyInBuffer) continue;

          const alreadyPosted = await this.databaseService.sent_news.findUnique({
            where: { news_hash: newsHash }
          });
          if (alreadyPosted) continue;

          this.logger.log(`🤖 Analyzing: ${newsItem.title?.substring(0, 60) ?? ''}...`);
          const analysisResult = await this.aiService.analyzeNewsUnified(newsItem);

          this.newsBuffer.push({
            newsItem,
            priority: analysisResult.priority,
            priorityReason: analysisResult.priorityReason,
            analysisResult,
            scannedAt: new Date()
          });

          this.logger.log(`✓ Added to buffer: ${analysisResult.priority} - ${newsItem.title?.substring(0, 50) ?? ''}`);
        } catch (error) {
          this.logger.error(`Error analyzing news item:`, error);
        }
      }

      this.logger.log(`✅ Scan complete. Buffer size: ${this.newsBuffer.length}`);
    } catch (error) {
      this.logger.error('Error in scanNews:', error);
    } finally {
      this.isScanning = false;
    }
  }

  @Cron('0 * * * ')
  async broadcastNews() {
    if (this.isBroadcasting) {
      this.logger.log('⏭️ Previous broadcast still processing, skipping...');
      return;
    }

    if (this.newsBuffer.length === 0) {
      this.logger.log('📭 No news in buffer to broadcast');
      return;
    }

    this.isBroadcasting = true;
    this.logger.log('📢 Starting hourly broadcast...');

    try {
      const priorityOrder = { RED: 3, YELLOW: 2, GREEN: 1 };
      this.newsBuffer.sort((a: BufferedNews, b: BufferedNews) => {
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        return b.scannedAt.getTime() - a.scannedAt.getTime();
      });

      const topNews = this.newsBuffer[0];
      if (!topNews) {
        this.logger.log('No top news found after sorting');
        this.isBroadcasting = false;
        return;
      }

      this.logger.log(`📰 Selected top news: ${topNews.priority} - ${topNews.newsItem.title?.substring(0, 50) ?? ''}`);

      await this.telegramService.broadcastNews(topNews.newsItem);

      const newsHash = this.rssService.generateNewsHash(topNews.newsItem);
      await this.databaseService.sent_news.create({
        data: {
          news_hash: newsHash,
          priority: topNews.priority,
          sent_at: new Date()
        }
      });

      this.newsBuffer = this.newsBuffer.filter(n => n !== topNews);
      this.logger.log(`✅ Broadcast complete. Remaining buffer: ${this.newsBuffer.length}`);
    } catch (error) {
      this.logger.error('Error in broadcastNews:', error);
    } finally {
      this.isBroadcasting = false;
    }
  }
}
