import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser: Parser;

  private readonly feeds = [
    'https://cointelegraph.com/rss',
    'https://cryptopotato.com/feed/',
    'https://cryptoslate.com/feed/',
    'https://decrypt.co/feed',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://bitcoinmagazine.com/.rss/full/',
    'https://cryptonews.com/news/feed/',
    'https://u.today/rss',
    'https://ambcrypto.com/feed/',
  ];

  constructor() {
    this.parser = new Parser();
    this.logger.log('✅ RssService initialized');
  }

  async fetchAllNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const feedUrl of this.feeds) {
      try {
        const feed = await this.parser.parseURL(feedUrl);
        const items: NewsItem[] = feed.items.map((item) => ({
          title: item.title || 'No title',
          link: item.link || '',
          content: item.contentSnippet || item.content || '',
          pubDate: item.pubDate || new Date().toISOString(),
          source: feed.title || feedUrl,
          imageUrl: item.enclosure?.url || undefined,
        }));

        allNews.push(...items);
      } catch (error) {
        this.logger.error(`Error fetching ${feedUrl}:`, error.message);
      }
    }

    return allNews;
  }
}
