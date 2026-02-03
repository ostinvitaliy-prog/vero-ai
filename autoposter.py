import asyncio
import feedparser
import logging
import database as db
from ai_engine import analyze_and_style_news, extract_image_from_source

RSS_FEEDS = {
    "Cointelegraph": "https://cointelegraph.com/rss",
    "Decrypt": "https://decrypt.co/feed",
    "ForkLog": "https://forklog.com/feed"
}

last_posted_link = None

async def start_autoposter(bot):
    global last_posted_link

    await asyncio.sleep(15)  # даём боту полностью подняться

    while True:
        try:
            for source_name, feed_url in RSS_FEEDS.items():
                feed = feedparser.parse(feed_url)
                if not feed.entries:
                    continue

                entry = feed.entries[0]

                if entry.link == last_posted_link:
                    continue

                last_posted_link = entry.link
                users = db.get_all_users()

                for user_id, lang in users:
                    analysis = await analyze_and_style_news(
                        entry.title,
                        entry.summary[:500],
                        lang,
                        source_name
                    )

                    if not analysis:
                        continue

                    img = await extract_image_from_source(entry.link)

                    try:
                        # ✅ ВСЕГДА: фото отдельно, текст отдельно
                        if img:
                            await bot.send_photo(user_id, img)

                        await bot.send_message(
                            user_id,
                            analysis,
                            parse_mode="HTML"
                        )

                    except Exception as e:
                        logging.error(f"Send error to {user_id}: {e}")
                        continue

                    await asyncio.sleep(0.5)

                break  # один источник за цикл

        except Exception as e:
            logging.error(f"Autoposter loop error: {e}")

        await asyncio.sleep(600)  # 10 минут
