import logging
import asyncio
import feedparser
import httpx
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# --- НАСТРОЙКИ ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

async def analyze_news_ai(title, description, lang):
    # Улучшенная инструкция для крутого стиля
    target_lang = "Russian" if lang == 'ru' else "English"
    
    prompt = f"""
    Write a professional crypto-channel post in {target_lang} based on this news:
    Title: {title}
    Description: {description}

    STRICT FORMAT:
    1. Catchy Headline with emoji
    2. ⚡️ **ESSENCE**: 1-2 sharp sentences.
    3. 📊 **MARKET IMPACT**: How it affects prices or trends.
    4. 💎 **VERO VERDICT**: Unique insider-style opinion.
    5. #VERO #Crypto #News
    
    Style: Bold, expert, concise. Use Markdown.
    """
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            if resp.status_code != 200:
                return f"❌ AI Error: {resp.status_code}"
            return resp.json()['choices'][0]['message']['content']
        except Exception as e:
            return f"❌ Error: {str(e)[:50]}"

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = [[types.KeyboardButton(text="/news_ru"), types.KeyboardButton(text="/news_en")]]
    keyboard = types.ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)
    await message.answer("🦾 **VERO AI Engine Online.**\nВыбери ленту новостей:", reply_markup=keyboard)

@dp.message(Command("news_ru"))
async def get_ru(message: types.Message):
    await process_news(message, 'ru')

@dp.message(Command("news_en"))
async def get_en(message: types.Message):
    await process_news(message, 'en')

async def process_news(message, lang):
    status_msg = await message.answer("🤖 VERO AI сканирует рынок...")
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if feed.entries:
        entry = feed.entries[0]
        report = await analyze_news_ai(entry.title, entry.description, lang)
        await status_msg.delete()
        await message.answer(f"{report}\n\n🔗 [Читать источник]({entry.link})", parse_mode="Markdown", disable_web_page_preview=True)

async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
