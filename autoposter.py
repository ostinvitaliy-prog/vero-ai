import asyncio
import feedparser
import logging
from ai_engine import analyze_and_style_news, extract_image_from_source
import database as db
from config import NEWS_CHECK_INTERVAL, MIN_NEWS_SCORE

RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://decrypt.co/feed"
]

async def start_autoposter(bot):
    """Автопостинг новостей каждые 10 минут"""
    await asyncio.sleep(5)
    logging.info("🚀 VERO Autoposter started")

    while True:
        try:
            for feed_url in RSS_FEEDS:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:3]:
                    link = entry.link

                    if db.is_news_posted(link):
                        continue

                    title = entry.get('title', 'No title')
                    description = entry.get('summary', '')[:300]

                    analysis = await analyze_and_style_news(title, description, link)

                    if not analysis or analysis.get('score', 0) < MIN_NEWS_SCORE:
                        continue

                    db.save_news(
                        analysis.get('ru', ''),
                        analysis.get('en', ''),
                        analysis.get('es', ''),
                        analysis.get('de', ''),
                        link,
                        analysis.get('score', 0)
                    )

                    # Отправка новости всем пользователям
                    for lang in ['ru', 'en', 'es', 'de']:
                        users = db.get_users_by_lang(lang)
                        text = analysis.get(lang, '')

                        for user_id in users:
                            try:
                                await bot.send_message(
                                    user_id,
                                    f"{text}\n\n🔗 <a href='{link}'>Источник</a>",
                                    parse_mode="HTML",
                                    disable_web_page_preview=True
                                )
                                await asyncio.sleep(0.3)
                            except Exception as e:
                                logging.error(f"Send error to {user_id}: {e}")

                    logging.info(f"✅ News posted: {title[:50]}")
                    await asyncio.sleep(2)

        except Exception as e:
            logging.error(f"Autoposter error: {e}")

        await asyncio.sleep(NEWS_CHECK_INTERVAL)
