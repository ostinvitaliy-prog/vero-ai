import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import * as crypto from 'crypto-js';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private parser = new Parser();

  async getNewsForPosting(): Promise<NewsItem[]> {
    // Your RSS fetching logic here
    return [];
  }

  generateNewsHash(newsItem: NewsItem): string {
    return crypto.SHA256(newsItem.title + newsItem.link).toString();
  }

  extractImageFromItem(item: any): string | undefined {
    // Your logic to extract image URL from RSS item
    return item.enclosure?.url || item.image?.url || undefined;
  }

  async parseFeed(feedUrl: string): Promise<NewsItem[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const newsItems: NewsItem[] = feed.items.map(item => ({
        title: item.title || '',
        description: item.contentSnippet || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        imageUrl: this.extractImageFromItem(item),
      }));
      return newsItems;
    } catch (error) {
      this.logger.error(`Failed to parse feed ${feedUrl}:`, error);
      return [];
    }
  }
}
