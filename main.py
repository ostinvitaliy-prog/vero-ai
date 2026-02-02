import logging
import asyncio
import feedparser
import httpx
from aiogram import Bot, Dispatcher, types
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# --- НАСТРОЙКИ ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"
CHANNEL_ID = "@твой_канал" # ЗАМЕНИ НА ID СВОЕГО КАНАЛА (например @vero_ai_news)

# Список языков для вещания
LANGUAGES = {
    'ru': 'Russian',
    'en': 'English',
    'es': 'Spanish',
    'de': 'German'
}

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None # Временное хранение последней новости

async def analyze_news_ai(title, description, lang_name):
    prompt = f"""
    ROLE: Elite Crypto Insider Editor.
    TASK: Transform news into a "expensive", bold, and concise Telegram post in {lang_name}.
    
    NEWS DATA:
    Title: {title}
    Description: {description}

    STRICT FORMAT:
    1. ⚡️ [CATCHY UPPERCASE HEADLINE]
    2. [2 sentences of pure essence. No water. Bold facts only.]
    3. 💎 VERO TAKE: [One sentence of insider-style market impact or alpha.]
    4. #VERO #Crypto #{lang_name[:2].upper()}

    STYLE RULES:
    - Use professional slang (LFG, Whale, Bullish, FOMO).
    - No "According to...", no "In this article...".
    - Be sharp, be confident, be expensive.
    - Use Markdown for bolding.
    """
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5 # Ниже температура = стабильнее стиль
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return resp.json()['choices'][0]['message']['content']
        except Exception as e:
            return None

async def auto_post_job():
    global last_posted_link
    logging.info("Checking for new crypto alpha...")
    
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if not feed.entries:
        return

    entry = feed.entries[0]
    
    # Проверка на дубликат
    if entry.link == last_posted_link:
        logging.info("No new news found.")
        return

    last_posted_link = entry.link
    
    # Пытаемся достать картинку
    image_url = None
    if 'media_content' in entry:
        image_url = entry.media_content[0]['url']
    elif 'links' in entry:
        for link in entry.links:
            if 'image' in link.get('type', ''):
                image_url = link.get('href')

    # Генерируем и постим на всех языках
    for lang_code, lang_name in LANGUAGES.items():
        report = await analyze_news_ai(entry.title, entry.description, lang_name)
        if report:
            try:
                full_text = f"{report}\n\n🔗 [Source]({entry.link})"
                if image_url:
                    await bot.send_photo(CHANNEL_ID, photo=image_url, caption=full_text, parse_mode="Markdown")
                else:
                    await bot.send_message(CHANNEL_ID, text=full_text, parse_mode="Markdown", disable_web_page_preview=True)
                await asyncio.sleep(2) # Пауза между языками
            except Exception as e:
                logging.error(f"Failed to post in {lang_name}: {e}")

async def main():
    # Настройка планировщика
    scheduler = AsyncIOScheduler()
    scheduler.add_job(auto_post_job, "interval", minutes=30) # Постим каждые 30 минут
    scheduler.start()

    logging.info("VERO Engine Started...")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
