@Cron('0 * * * *')
async broadcastNews() {
  if (this.isBroadcasting) {
    this.logger.log('⏭️ Previous broadcast still processing, skipping...');
    return;
  }

  if (this.newsBuffer.length === 0) {
    this.logger.log('📭 No news in buffer to broadcast');
    return;
  }

  this.isBroadcasting = true;
  this.logger.log('📢 Starting hourly broadcast...');

  try {
    const priorityOrder = { RED: 3, YELLOW: 2, GREEN: 1 };
    this.newsBuffer.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return b.scannedAt.getTime() - a.scannedAt.getTime();
    });

    const topNews = this.newsBuffer[0];
    this.logger.log(`📰 Selected top news: ${topNews.priority} - ${topNews.newsItem.title.substring(0, 50)}`);

    await this.telegramService.broadcastNews(topNews.newsItem);

    const newsHash = this.rssService.generateNewsHash(topNews.newsItem);
    await this.databaseService.sent_news.create({
      data: {
        news_hash: newsHash,
        priority: topNews.priority,
        sent_at: new Date()
      }
    });

    this.newsBuffer = this.newsBuffer.filter(n => n !== topNews);
    this.logger.log(`✅ Broadcast complete. Remaining buffer: ${this.newsBuffer.length}`);
  } catch (error) {
    this.logger.error('Error in broadcastNews:', error);
  } finally {
    this.isBroadcasting = false;
  }
}
