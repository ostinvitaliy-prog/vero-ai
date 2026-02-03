import asyncio
import feedparser
import logging
from ai_engine import analyze_and_style_news, extract_image_from_source
import database as db

RSS_FEEDS = [
    "https://cointelegraph.com/rss",
    "https://decrypt.co/feed"
]

last_posted_link = None

async def start_autoposter(bot):
    global last_posted_link
    await asyncio.sleep(10)
    
    while True:
        try:
            for feed_url in RSS_FEEDS:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:1]:
                    if entry.link == last_posted_link:
                        continue
                    
                    last_posted_link = entry.link
                    users = db.get_all_users()
                    
                    for user_id, lang in users:
                        analysis = await analyze_and_style_news(entry.title, entry.summary[:400], lang)
                        img = await extract_image_from_source(entry.link)
                        text = analysis if analysis else f"📢 <b>{entry.title}</b>\n\n{entry.link}"
                        
                        try:
                            if img:
                                await bot.send_photo(user_id, img, caption=text[:1024], parse_mode="HTML")
                            else:
                                await bot.send_message(user_id, text, parse_mode="HTML")
                        except:
                            continue
                        await asyncio.sleep(0.5)
                    break
        except Exception as e:
            logging.error(f"Autoposter error: {e}")
        
        await asyncio.sleep(600)  # 10 минут
