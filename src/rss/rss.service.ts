import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

@Injectable()
export class RssService {
  private parser = new Parser();

  async getLatestNews() {
    const feeds = [
      'https://bits.media/rss2/',
      'https://forklog.com/feed/'
    ];

    try {
      const allNews = [];
      for (const url of feeds) {
        const feed = await this.parser.parseURL(url);
        allNews.push(...feed.items);
      }
      
      // Исправляем ошибку типизации даты для билда
      return allNews.sort((a, b) => {
        const dateB = new Date(b.pubDate || new Date()).getTime();
        const dateA = new Date(a.pubDate || new Date()).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      console.error('RSS Parsing Error:', error);
      return [];
    }
  }
}
