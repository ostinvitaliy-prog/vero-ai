import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { NewsItem } from '../ai/ai.service';
import * as crypto from 'crypto-js';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async getAllNewsHashes(): Promise<string[]> {
    const news = await this.sent_news.findMany({
      select: { news_hash: true },
    });
    return news.map((n: any) => n.news_hash);
  }

  async saveNews(newsItem: NewsItem): Promise<void> {
    const newsHash = crypto.SHA256(newsItem.link).toString();

    const existing = await this.sent_news.findUnique({
      where: { news_hash: newsHash }
    });

    if (!existing) {
      await this.sent_news.create({
        data: {
          news_hash: newsHash,
        },
      });

      await this.news_priority.upsert({
        where: { news_hash: newsHash },
        update: {
          priority: newsItem.priority || 'GREEN',
          priority_reason: newsItem.priorityReason || null,
        },
        create: {
          news_hash: newsHash,
          priority: newsItem.priority || 'GREEN',
          priority_reason: newsItem.priorityReason || null,
        },
      });
    }
  }

  async markAsPosted(link: string): Promise<void> {
    const newsHash = crypto.SHA256(link).toString();
    
    await this.sent_news.upsert({
      where: { news_hash: newsHash },
      update: { sent_at: new Date() },
      create: { news_hash: newsHash },
    });
  }
}
