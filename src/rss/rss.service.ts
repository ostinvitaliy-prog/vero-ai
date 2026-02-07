import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import * as crypto from 'crypto-js';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private parser = new Parser();

  async getNewsForPosting(): Promise<NewsItem[]> {
    // Implement reading multiple feeds and merging logic
    // For now return empty array to avoid runtime issues
    return [];
  }

  generateNewsHash(newsItem: NewsItem): string {
    return crypto.SHA256((newsItem.title || '') + (newsItem.link || '')).toString();
  }

  extractImageFromItem(item: any): string | undefined {
    // try common places
    return item.enclosure?.url || item.image?.url || item['media:content']?.url || undefined;
  }

  async parseFeed(feedUrl: string): Promise<NewsItem[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      return (feed.items || []).map(item => ({
        title: item.title || '',
        description: item.contentSnippet || item.content || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        imageUrl: this.extractImageFromItem(item)
      }));
    } catch (error) {
      this.logger.error(`Failed to parse feed ${feedUrl}:`, error);
      return [];
    }
  }
}
