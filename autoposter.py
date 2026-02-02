import asyncio
import feedparser
import database as db
import ai_engine as ai
from config import NEWS_CHECK_INTERVAL, MIN_NEWS_SCORE

async def start_autoposter(bot):
    last_link = None
    while True:
        try:
            feed = feedparser.parse("https://cointelegraph.com/rss")
            if feed.entries:
                entry = feed.entries[0]
                if entry.link != last_link:
                    last_link = entry.link
                    res = await ai.analyze_and_style_news(entry.title, entry.description)
                    
                    if res and res.get('score', 0) >= MIN_NEWS_SCORE:
                        db.save_news(res['content'], entry.link, res['score'])
                        users = db.get_all_users()
                        for u_id in users:
                            try:
                                await bot.send_message(u_id, f"{res['content']}\n\n🔗 <a href='{entry.link}'>Источник</a>", parse_mode="HTML", disable_web_page_preview=True)
                            except: pass
            await asyncio.sleep(NEWS_CHECK_INTERVAL)
        except: await asyncio.sleep(60)
