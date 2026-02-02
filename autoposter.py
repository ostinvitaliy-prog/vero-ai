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
                        db.save_news(res['ru'], res['en'], res['es'], res['de'], entry.link, res['score'])
                        
                        # ИСПРАВЛЕНО: вызываем image_generation вместо Image Generation
                        image_url = await ai.image_generation(res.get('image_prompt', 'crypto technology'))
                        
                        for lang in ['ru', 'en', 'es', 'de']:
                            users = db.get_users_by_lang(lang)
                            for u_id in users:
                                try:
                                    text = f"{res[lang]}\n\n🔗 <a href='{entry.link}'>Source</a>"
                                    if image_url:
                                        await bot.send_photo(u_id, image_url, caption=text, parse_mode="HTML")
                                    else:
                                        await bot.send_message(u_id, text, parse_mode="HTML", disable_web_page_preview=True)
                                except: pass
            
            await asyncio.sleep(NEWS_CHECK_INTERVAL)
        except: 
            await asyncio.sleep(60)
