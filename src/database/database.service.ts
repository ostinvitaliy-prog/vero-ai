import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { NewsItem } from '../ai/ai.service';

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
    const news = await this.news.findMany({
      select: { link: true },
    });
    return news.map((n) => n.link);
  }

  async saveNews(newsItem: NewsItem): Promise<void> {
    await this.news.create({
      data: {
        title: newsItem.title,
        link: newsItem.link,
        content: newsItem.content,
        pubDate: newsItem.pubDate,
        source: newsItem.source,
        imageUrl: newsItem.imageUrl,
        priority: newsItem.priority,
        priorityReason: newsItem.priorityReason,
        postEn: newsItem.postEn,
        postRu: newsItem.postRu,
        isPosted: false,
      },
    });
  }

  async markAsPosted(link: string): Promise<void> {
    await this.news.updateMany({
      where: { link },
      data: { isPosted: true },
    });
  }
}
