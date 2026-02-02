import logging
import asyncio
import feedparser
import os
import httpx
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# --- SETTINGS ---
API_TOKEN = '8050168002:AAFLZNI1cEQEX0L96PPks7-Er4BydJ06glA'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# --- VERO AI BRAIN ---
async def analyze_news_ai(title, description, lang='ru'):
    prompt = f"""
    Role: VERO AI — professional crypto expert and market analyst.
    Language: {lang}

    Task: Analyze the news and write a Telegram post.
    Style: Smart, confident, expert, slightly bold/edgy. No hype, just deep insight.

    NEWS DATA:
    Title: {title}
    Description: {description}

    FORMAT:
    🔥 <Catchy Title in {lang}>

    📝 Суть: 1-2 sentences.

    📊 Что это значит для рынка: Deep analysis.

    💡 Вердикт VERO: Buy/Sell/Neutral + short expert opinion.

    🌍 #tags
    """

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "openai/gpt-4o", 
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return response.json()['choices'][0]['message']['content']
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return f"❌ AI Error. Original Title: {title}"

# --- COMMAND HANDLERS ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = [
        [types.KeyboardButton(text="/news_ru"), types.KeyboardButton(text="/news_en")],
        [types.KeyboardButton(text="/news_de"), types.KeyboardButton(text="/news_es")]
    ]
    keyboard = types.ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)
    await message.answer("🦾 **VERO AI: Crypto Expert Mode Active**\n\nВыбери язык для получения свежей аналитики:", reply_markup=keyboard, parse_mode="Markdown")

@dp.message(Command("news_ru"))
async def get_ru(message: types.Message):
    await process_news(message, 'ru')

@dp.message(Command("news_en"))
async def get_en(message: types.Message):
    await process_news(message, 'en')

@dp.message(Command("news_de"))
async def get_de(message: types.Message):
    await process_news(message, 'de')

@dp.message(Command("news_es"))
async def get_es(message: types.Message):
    await process_news(message, 'es')

async def process_news(message, lang):
    status_msg = await message.answer("🤖 VERO AI анализирует рынок...")
    try:
        feed = feedparser.parse("https://cointelegraph.com/rss")
        if feed.entries:
            entry = feed.entries[0]
            report = await analyze_news_ai(entry.title, entry.description, lang)
            await status_msg.delete()
            await message.answer(f"{report}\n\n🔗 [Source]({entry.link})", parse_mode="Markdown", disable_web_page_preview=True)
        else:
            await status_msg.edit_text("❌ Не удалось получить новости.")
    except Exception as e:
        logging.error(f"Process news error: {e}")
        await status_msg.edit_text("❌ Произошла ошибка при обработке.")

async def main():
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
