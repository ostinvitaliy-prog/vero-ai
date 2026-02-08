import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

@Injectable()
export class RssService {
  private parser = new Parser();

  // Мы даем методу именно то имя, которое ищет CronService
  async getLatestNews() {
    // Список твоих источников
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
      
      // Сортируем по дате, чтобы в начале были самые свежие
      return allNews.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );
    } catch (error) {
      console.error('RSS Parsing Error:', error);
      return [];
    }
  }
}
