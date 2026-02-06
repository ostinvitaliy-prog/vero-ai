import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import * as crypto from 'crypto-js';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser: Parser;
  private readonly rssFeeds = [
    'https://cointelegraph.com/rss',
    'https://decrypt.co/feed',
    'https://forklog.com/feed/',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://news.bitcoin.com/feed/',
    'https://cryptoslate.com/feed/',
    'https://www.theblock.co/rss.xml',
    'https://beincrypto.com/feed/',
    'https://u.today/rss.php'
  ];
  
  private newsCache: Map<string, NewsItem[]> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'media'],
          ['enclosure', 'enclosure']
        ]
      }
    });
  }

  generateNewsHash(newsItem: NewsItem): string {
    const hashInput = `${newsItem.title}-${newsItem.link}`;
    return crypto.SHA256(hashInput).toString();
  }

  private extractImageFromItem(item: any): string | undefined {
    // Try various common RSS image fields
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }
    if (item.media?.$ && item.media.$['url']) {
      return item.media.$.url;
    }
    if (item['media:thumbnail']?.$ && item['media:thumbnail'].$['url']) {
      return item['media:thumbnail'].$.url;
    }
    if (item['media:content']?.$ && item['media:content'].$['url']) {
      return item['media:content'].$.url;
    }
    
    // Try to extract from content
    const content = item.content || item['content:encoded'] || item.description || '';
    const imgRegex = /<img[^>]+src="([^">]+)"/i;
    const match = content.match(imgRegex);
    if (match && match[1]) {
      return match[1];
    }

    return undefined;
  }

  private cleanHtmlContent(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private isCryptoRelevant(title: string, description: string): boolean {
    const cryptoKeywords = [
      // Основные криптовалюты
      'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain',
      // DeFi и токены
      'defi', 'nft', 'token', 'coin', 'mining', 'wallet', 'exchange',
      'altcoin', 'stablecoin', 'web3', 'dao', 
      // Популярные проекты
      'solana', 'cardano', 'polygon', 'binance', 'coinbase', 
      'xrp', 'ripple', 'dogecoin', 'shiba', 'avalanche', 'polkadot',
      // Торговля и рынок
      'trading', 'market', 'price', 'bull', 'bear', 'rally', 'dump',
      // Макроэкономика (важно для крипты)
      'fed', 'federal reserve', 'interest rate', 'фрс', 'ставк',
      'inflation', 'инфляци', 'recession', 'рецесси',
      // Аналитика и индикаторы
      'cryptoquant', 'glassnode', 'analyst', 'forecast', 'прогноз',
      'indicator', 'индикатор', 'puell', 'mvrv', 'technical analysis',
      // Майнинг
      'miner', 'майнер', 'hash rate', 'difficulty',
      // Регуляция
      'sec', 'регулиров', 'regulation', 'lawsuit', 'иск'
    ];

    const text = `${title} ${description}`.toLowerCase();
    return cryptoKeywords.some(keyword => text.includes(keyword));
  }

  async fetchLatestNews(): Promise<NewsItem[]> {
    const cacheKey = 'all_feeds';
    const cached = this.newsCache.get(cacheKey);
    
    if (cached) {
      this.logger.log('Returning cached news');
      return cached;
    }

    const allNews: NewsItem[] = [];

    for (const feedUrl of this.rssFeeds) {
      try {
        this.logger.log(`Fetching RSS feed: ${feedUrl}`);
        const feed = await this.parser.parseURL(feedUrl);
        
        for (const item of feed.items) {
          const title = item.title || '';
          const description = this.cleanHtmlContent(item.contentSnippet || item.description || '');
          
          if (!this.isCryptoRelevant(title, description)) {
            continue;
          }

          const newsItem: NewsItem = {
            title,
            description: description.substring(0, 500), // Limit description length
            link: item.link || '',
            imageUrl: this.extractImageFromItem(item),
            pubDate: item.pubDate || new Date().toISOString()
          };

          allNews.push(newsItem);
        }

        this.logger.log(`Fetched ${feed.items.length} items from ${feedUrl}`);
      } catch (error) {
        this.logger.error(`Error fetching RSS feed ${feedUrl}:`, error);
      }
    }

    // Remove duplicates based on title similarity
    const uniqueNews: NewsItem[] = [];
    const seenTitles = new Set<string>();
    
    for (const news of allNews) {
      // Normalize title: lowercase, remove punctuation, split into words
      const normalizedTitle = news.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3) // Only keep words longer than 3 chars
        .sort()
        .join(' ');
      
      // Check if similar title already exists
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        // Calculate similarity (simple word overlap)
        const seenWords = new Set(seenTitle.split(' '));
        const currentWords = new Set(normalizedTitle.split(' '));
        const overlap = [...seenWords].filter(w => currentWords.has(w)).length;
        const similarity = overlap / Math.max(seenWords.size, currentWords.size);
        
        if (similarity > 0.6) { // 60% similarity threshold
          isDuplicate = true;
          this.logger.log(`Duplicate detected: "${news.title.substring(0, 40)}..." (similar to existing)`);
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueNews.push(news);
        seenTitles.add(normalizedTitle);
      }
    }
    
    this.logger.log(`After deduplication: ${uniqueNews.length} unique news from ${allNews.length} total`);

    // Sort by date (newest first)
    uniqueNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // Take only the latest 20 news items for better coverage
    const latestNews = uniqueNews.slice(0, 20);

    // Cache the results
    this.newsCache.set(cacheKey, latestNews);
    setTimeout(() => this.newsCache.delete(cacheKey), this.CACHE_DURATION);

    this.logger.log(`Total crypto-relevant news fetched: ${latestNews.length}`);
    return latestNews;
  }

  async getNewsForPosting(): Promise<NewsItem[]> {
    const allNews = await this.fetchLatestNews();
    
    // CRITICAL: Filter only news published within the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const freshNews = allNews.filter(news => {
      const pubDate = new Date(news.pubDate);
      const isFresh = pubDate > oneHourAgo;
      if (!isFresh) {
        this.logger.log(`⏰ SKIPPING OLD NEWS (${Math.round((Date.now() - pubDate.getTime()) / (60 * 1000))}min ago): ${news.title.substring(0, 50)}...`);
      }
      return isFresh;
    });
    
    this.logger.log(`🕐 Fresh news (last hour): ${freshNews.length} of ${allNews.length} total`);
    return freshNews.slice(0, 10); // Return top 10 fresh news for posting
  }

  // Find image for news by searching in other sources
  async findImageForNews(newsItem: NewsItem): Promise<string | undefined> {
    try {
      this.logger.log(`🔎 Searching for image in other sources for: ${newsItem.title.substring(0, 40)}...`);
      
      // Get all news from all sources
      const allNews: NewsItem[] = [];
      
      for (const feedUrl of this.rssFeeds) {
        try {
          const feed = await this.parser.parseURL(feedUrl);
          
          for (const item of feed.items) {
            const title = item.title || '';
            const description = this.cleanHtmlContent(item.contentSnippet || item.description || '');
            
            const itemNews: NewsItem = {
              title,
              description,
              link: item.link || '',
              image: this.extractImageFromItem(item),
              pubDate: item.pubDate || new Date().toISOString()
            };
            
            // Check if this is similar news
            if (this.areSimilarNews(newsItem, itemNews)) {
              if (itemNews.image) {
                this.logger.log(`✅ Found image in ${feedUrl}: ${itemNews.image}`);
                return itemNews.image;
              }
            }
          }
        } catch (error) {
          // Continue to next source
        }
      }
      
      this.logger.warn(`⚠️ No image found in any source`);
      return undefined;
    } catch (error) {
      this.logger.error('Error finding image:', error);
      return undefined;
    }
  }

  // Check if two news items are about the same story
  private areSimilarNews(news1: NewsItem, news2: NewsItem): boolean {
    // Normalize titles
    const normalize = (text: string) => text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .sort()
      .join(' ');
    
    const title1Words = new Set(normalize(news1.title).split(' '));
    const title2Words = new Set(normalize(news2.title).split(' '));
    
    // Calculate word overlap
    const overlap = [...title1Words].filter(w => title2Words.has(w)).length;
    const similarity = overlap / Math.max(title1Words.size, title2Words.size);
    
    return similarity > 0.5; // 50% similarity
  }
}
