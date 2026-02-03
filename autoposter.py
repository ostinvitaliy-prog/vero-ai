import asyncio
import feedparser
import logging
import database as db
import ai_engine as ai
from config import NEWS_CHECK_INTERVAL, MIN_NEWS_SCORE

async def start_autoposter(bot):
    """
    Мониторит топовые англоязычные источники, анализирует через AI,
    постит только важные новости (score >= MIN_NEWS_SCORE).
    """
    last_links = set()
    
    sources = [
        ("https://cointelegraph.com/rss", "Cointelegraph"),
        ("https://www.coindesk.com/arc/outboundfeeds/rss/", "CoinDesk"),
        ("https://decrypt.co/feed", "Decrypt")
    ]
    
    logging.info("🚀 VERO Autoposter started. Monitoring global crypto news...")
    
    while True:
        try:
            for rss_url, source_name in sources:
                feed = feedparser.parse(rss_url)
                
                if not feed.entries:
                    continue
                
                # Берём только самую свежую новость из каждого источника
                entry = feed.entries[0]
                
                if entry.link in last_links:
                    continue
                
                last_links.add(entry.link)
                
                # Ограничиваем размер кэша
                if len(last_links) > 100:
                    last_links.pop()
                
                logging.info(f"📰 New from {source_name}: {entry.title[:50]}...")
                
                # AI анализ (на английском, потом переводит)
                analysis = await ai.analyze_and_style_news(
                    entry.title, 
                    entry.get('description', entry.get('summary', '')),
                    entry.link
                )
                
                if not analysis:
                    logging.warning("AI analysis failed, skipping...")
                    continue
                
                score = analysis.get('score', 0)
                
                # Постим только важное (7+ из 10)
                if score < MIN_NEWS_SCORE:
                    logging.info(f"⏭️ Score {score}/10 - skipping (not important enough)")
                    continue
                
                logging.info(f"✅ Score {score}/10 - posting to users!")
                
                # Пытаемся достать картинку из источника
                image_url = await ai.extract_image_from_source(entry.link)
                
                # Сохраняем в БД
                db.save_news(
                    analysis.get('ru', ''), 
                    analysis.get('en', ''), 
                    analysis.get('es', ''), 
                    analysis.get('de', ''), 
                    entry.link, 
                    score
                )
                
                # Рассылка по языкам
                for lang in ['ru', 'en', 'es', 'de']:
                    users = db.get_users_by_lang(lang)
                    
                    if not users:
                        continue
                    
                    text = f"{analysis[lang]}\n\n🔗 <a href='{entry.link}'>Source: {source_name}</a>"
                    
                    for user_id in users:
                        try:
                            if image_url:
                                await bot.send_photo(
                                    user_id, 
                                    image_url, 
                                    caption=text, 
                                    parse_mode="HTML"
                                )
                            else:
                                await bot.send_message(
                                    user_id, 
                                    text, 
                                    parse_mode="HTML", 
                                    disable_web_page_preview=False
                                )
                        except Exception as e:
                            logging.error(f"Failed to send to {user_id}: {e}")
                
                # Небольшая пауза между источниками
                await asyncio.sleep(3)
            
            # Основной интервал проверки
            logging.info(f"💤 Sleeping for {NEWS_CHECK_INTERVAL}s...")
            await asyncio.sleep(NEWS_CHECK_INTERVAL)
            
        except Exception as e:
            logging.error(f"Autoposter error: {e}")
            await asyncio.sleep(60)
