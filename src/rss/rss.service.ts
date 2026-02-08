import { Injectable } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { NewsItem } from '../ai/ai.service';

@Injectable()
export class RssService {
  private parser = new Parser();

  async fetchFeed(url: string): Promise<NewsItem[]> {
    const feed = await this.parser.parseURL(url);
    return feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      text: item.contentSnippet || item.content || '',
      content: item.content || '',
      pubDate: item.pubDate || '',
      source: url,
      image: undefined // или логика поиска картинки
    }));
  }
}
