import asyncio
import feedparser
import logging
from ai_engine import analyze_and_style_news, extract_image_from_source
import database as db

# Добавлен ForkLog для расширения базы новостей
RSS_FEEDS = {
    "Cointelegraph": "https://cointelegraph.com/rss",
    "Decrypt": "https://decrypt.co/feed",
    "ForkLog": "https://forklog.com/feed"
}

last_posted_link = None

async def start_autoposter(bot):
    global last_posted_link
    await asyncio.sleep(10)
    
    while True:
        try:
            for source_name, feed_url in RSS_FEEDS.items():
                feed = feedparser.parse(feed_url)
                if not feed.entries:
                    continue
                    
                for entry in feed.entries[:1]:
                    if entry.link == last_posted_link:
                        continue
                    
                    last_posted_link = entry.link
                    users = db.get_all_users()
                    
                    for user_id, lang in users:
                        # Передаем название источника для корректной подписи в конце новости
                        analysis = await analyze_and_style_news(entry.title, entry.summary[:400], lang, source_name)
                        img = await extract_image_from_source(entry.link)
                        
                        text = analysis if analysis else f"📢 <b>{entry.title}</b>\n\n{entry.link}\n\n📰 <b>Источник:</b> {source_name}"
                        
                        try:
                            if img:
                                await bot.send_photo(user_id, img, caption=text[:1024], parse_mode="HTML")
                            else:
                                await bot.send_message(user_id, text, parse_mode="HTML")
                        except Exception as e:
                            logging.error(f"Failed to send to {user_id}: {e}")
                            continue
                        await asyncio.sleep(0.5)
                    break
        except Exception as e:
            logging.error(f"Autoposter error: {e}")
        
        await asyncio.sleep(600)  # Проверка каждые 10 минут
