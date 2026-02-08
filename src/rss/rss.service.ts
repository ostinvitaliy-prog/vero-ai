import { Injectable } from '@nestjs/common';
import Parser = require('rss-parser');
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private parser = new Parser();

  // Этот метод вызывает твой cron.service
  async fetchAllNews(): Promise<NewsItem[]> {
    // Список твоих RSS фидов. Если у тебя есть список в конфиге, можно брать оттуда
    const feeds = [
      'https://bits.media/rss/', 
      'https://forklog.com/feed/'
    ]; 
    
    let allItems: NewsItem[] = [];
    for (const url of feeds) {
      try {
        const items = await this.fetchFeed(url);
        allItems = [...allItems, ...items];
      } catch (e) {
        console.error(`Error fetching feed ${url}`);
      }
    }
    return allItems;
  }

  async fetchFeed(url: string): Promise<NewsItem[]> {
    const feed = await this.parser.parseURL(url);
    return feed.items.map((item: any) => ({
      title: item.title || '',
      link: item.link || '',
      text: item.contentSnippet || item.content || '',
      content: item.content || '',
      pubDate: item.pubDate || '',
      source: url,
      image: item.enclosure?.url || undefined,
      priority: 'GREEN' as const // Указываем как константу для TS
    }));
  }
}
