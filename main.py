import logging
import asyncio
import feedparser
import httpx
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder

# --- ТВОИ ДАННЫЕ ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None

# --- ИИ СТИЛЬ VERO ---
async def analyze_news_ai(title, description):
    prompt = f"""
    ROLE: VERO Media-Backed Asset Insider.
    TASK: Create a sharp, bold crypto post in Russian.
    CONTEXT: VERO is a media-backed asset. Ad revenue buys back $VERO.
    NEWS: {title} - {description}
    FORMAT:
    1. ⚡️ [CATCHY UPPERCASE HEADLINE]
    2. [2-3 sentences of pure essence. Bold facts.]
    3. 💎 VERO VERDICT: [Insider market impact.]
    4. #VERO #Crypto
    """
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.5}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return resp.json()['choices'][0]['message']['content']
        except: return None

# --- МЕНЮ ---
def main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="📊 Live Report"), types.KeyboardButton(text="💎 VERO Exclusive"))
    builder.row(types.KeyboardButton(text="📢 Free Feed"), types.KeyboardButton(text="👤 My Profile"))
    return builder.as_markup(resize_keyboard=True)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer("🦾 **VERO | Media-Backed Asset**\n\nМы делаем новости — ты получаешь профит.", reply_markup=main_menu(), parse_mode="Markdown")

# --- ПРОСТАЯ АВТОМАТИЗАЦИЯ (БЕЗ APSCHEDULER) ---
async def auto_poster():
    global last_posted_link
    while True:
        try:
            feed = feedparser.parse("https://cointelegraph.com/rss")
            if feed.entries:
                entry = feed.entries[0]
                if entry.link != last_posted_link:
                    last_posted_link = entry.link
                    report = await analyze_news_ai(entry.title, entry.description)
                    if report:
                        # Здесь укажи ID своего чата или канала, если нужно. 
                        # Пока просто логируем, что новость готова.
                        logging.info(f"Новая новость готова: {entry.title}")
            
            await asyncio.sleep(1800) # Ждать 30 минут
        except Exception as e:
            logging.error(f"Ошибка в автопостере: {e}")
            await asyncio.sleep(60)

# --- ЗАПУСК ---
async def main():
    # Запускаем автопостер фоновой задачей
    asyncio.create_task(auto_poster())
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
