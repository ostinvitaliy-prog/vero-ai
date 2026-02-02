import logging
import asyncio
import feedparser
import httpx
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# --- НАСТРОЙКИ ---
API_TOKEN = '8050168002:AAH_eJ-Cl0YLAPIkxWP9HtQpFA-w_eHBtCs'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

async def analyze_news_ai(title, description, lang='ru'):
    prompt = f"Analyze this crypto news for a Telegram post in {lang}. Style: smart, edgy, expert. Title: {title}. Description: {description}. Format: Title, Essence, Market Impact, VERO Verdict, Tags."
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-5",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            if resp.status_code != 200:
                return f"❌ AI Error {resp.status_code}. Title: {title}"
            return resp.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"❌ Connection Error. Title: {title}"

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = [[types.KeyboardButton(text="/news_ru"), types.KeyboardButton(text="/news_en")]]
    keyboard = types.ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)
    await message.answer("🦾 **VERO AI Active.** Выбери язык:", reply_markup=keyboard, parse_mode="Markdown")

@dp.message(Command("news_ru"))
async def get_ru(message: types.Message):
    await process_news(message, 'ru')

@dp.message(Command("news_en"))
async def get_en(message: types.Message):
    await process_news(message, 'en')

async def process_news(message, lang):
    status_msg = await message.answer("🤖 VERO AI анализирует...")
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if feed.entries:
        entry = feed.entries[0]
        report = await analyze_news_ai(entry.title, entry.description, lang)
        await status_msg.delete()
        await message.answer(f"{report}\n\n🔗 [Source]({entry.link})", parse_mode="Markdown", disable_web_page_preview=True)

async def main():
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
