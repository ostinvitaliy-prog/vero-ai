import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import * as crypto from 'crypto-js';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private parser = new Parser();

  private feeds = [
    'https://cryptonews.com/news/feed',
    'https://cointelegraph.com/rss',
    'https://news.bitcoin.com/feed',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cryptoslate.com/feed/',
    'https://www.newsbtc.com/feed/',
    'https://bitcoinist.com/feed/',
    'https://www.ccn.com/feed/',
    'https://cryptopotato.com/feed/'
  ];

  async getNewsForPosting(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];
    for (const feedUrl of this.feeds) {
      const news = await this.parseFeed(feedUrl);
      allNews.push(...news);
    }
    // Optionally sort by pubDate descending
    allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return allNews;
  }

  generateNewsHash(newsItem: NewsItem): string {
    return crypto.SHA256((newsItem.title || '') + (newsItem.link || '')).toString();
  }

  extractImageFromItem(item: any): string | undefined {
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
