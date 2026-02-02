import logging
import asyncio
import feedparser
import aiohttp
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command

# --- НАСТРОЙКИ ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ABACUS_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

async def analyze_news_ai(title, description, lang='ru'):
    # Формируем четкую инструкцию для ИИ
    prompt = (
        f"Analyze this crypto news and write a Telegram post in {lang}. "
        f"Title: {title}\nDescription: {description}\n"
        "Format: Title, Essence, Market Impact, VERO Verdict, Tags."
    )
    
    url = "https://api.abacus.ai/v0/chatLLM"
    headers = {"Authorization": f"Bearer {ABACUS_API_KEY}"}
    payload = {"prompt": prompt}
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=40) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('response', '❌ No response from AI')
                else:
                    text = await resp.text()
                    return f"❌ AI Error {resp.status}: {text[:100]}"
    except Exception as e:
        return f"❌ Connection Error: {str(e)[:50]}"

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = [[types.KeyboardButton(text="/news_ru"), types.KeyboardButton(text="/news_en")]]
    keyboard = types.ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)
    await message.answer("🦾 **VERO AI Active.** Выбери язык новостей:", reply_markup=keyboard)

@dp.message(Command("news_ru"))
async def get_ru(message: types.Message):
    await process_news(message, 'ru')

@dp.message(Command("news_en"))
async def get_en(message: types.Message):
    await process_news(message, 'en')

async def process_news(message, lang):
    status_msg = await message.answer("🤖 VERO AI анализирует ленту...")
    # Берем свежие новости с Cointelegraph
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if feed.entries:
        entry = feed.entries[0]
        report = await analyze_news_ai(entry.title, entry.description, lang)
        await status_msg.delete()
        await message.answer(f"{report}\n\n🔗 [Source]({entry.link})", parse_mode="Markdown", disable_web_page_preview=True)
    else:
        await status_msg.edit_text("❌ Не удалось загрузить новости.")

async def main():
    # Очищаем очередь обновлений и запускаем бота
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
