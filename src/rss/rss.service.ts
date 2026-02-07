import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import * as crypto from 'crypto-js';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser: Parser;

  private readonly rssSources = [
    'https://cointelegraph.com/rss',
    'https://decrypt.co/feed',
    'https://cryptopotato.com/feed/',
    'https://bitcoinist.com/feed/',
    'https://cryptonews.com/news/feed/',
    'https://u.today/rss',
    'https://cryptoslate.com/feed/',
    'https://www.newsbtc.com/feed/',
    'https://ambcrypto.com/feed/',
  ];

  constructor() {
    this.parser = new Parser();
    this.logger.log('✅ RssService initialized');
  }

  async fetchAllNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const source of this.rssSources) {
      try {
        const feed = await this.parser.parseURL(source);
        const items = feed.items.slice(0, 10).map((item) => ({
          title: item.title || 'No title',
          link: item.link || '',
          content: item.contentSnippet || item.content || '',
          pubDate: new Date(item.pubDate || Date.now()),
          source: feed.title || source,
          imageUrl: item.enclosure?.url || undefined,
        }));
        allNews.push(...items);
      } catch (error) {
        this.logger.error(`Error fetching ${source}:`, error.message);
      }
    }

    return allNews;
  }
}
