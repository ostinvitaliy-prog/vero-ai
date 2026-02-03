import asyncio
import logging
import feedparser
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter, RSS_FEEDS
from ai_engine import analyze_and_style_news, extract_image_from_source
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_main_menu():
    return ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🧠 VERO News Analysis"), KeyboardButton(text="📊 Live Report")],
        [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="ℹ️ About VERO")],
        [KeyboardButton(text="👤 My Profile"), KeyboardButton(text="⚙️ Settings")]
    ], resize_keyboard=True)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(keyboard=[
        [KeyboardButton(text="🇷🇺 Русский"), KeyboardButton(text="🇺🇸 English")],
        [KeyboardButton(text="🇪🇸 Español"), KeyboardButton(text="🇩🇪 Deutsch")]
    ], resize_keyboard=True)
    await message.answer("<b>VERO | Media-Backed Asset</b>\n\nChoose language / Выберите язык:", reply_markup=kb, parse_mode="HTML")

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_lang(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)
    
    welcome = {
        "ru": "<b>👋 Добро пожаловать в VERO!</b>\n\nЯ — твой AI-аналитик. Я превращаю сложный шум рынка в понятные стратегии.\n\n🚀 <b>Лови последние 3 разбора:</b>",
        "en": "<b>👋 Welcome to VERO!</b>\n\nI am your AI analyst. I turn complex market noise into clear strategies.\n\n🚀 <b>Here are the last 3 analyses:</b>",
        "es": "<b>👋 ¡Bienvenido a VERO!</b>\n\nSoy tu analista de IA. Convierto el ruido complejo del mercado en estrategias claras.\n\n🚀 <b>Aquí tienes los últimos 3 análisis:</b>",
        "de": "<b>👋 Willkommen bei VERO!</b>\n\nIch bin dein KI-Analyst. Ich verwandle komplexes Marktrauschen in klare Strategien.\n\n🚀 <b>Hier sind die letzten 3 Analysen:</b>"
    }
    
    await message.answer(welcome.get(lang, welcome["en"]), reply_markup=get_main_menu(), parse_mode="HTML")
    
    sent = 0
    for source_name, feed_url in RSS_FEEDS.items():
        if sent >= 3: break
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:5]:
            if sent >= 3: break
            analysis = await analyze_and_style_news(entry.title, entry.summary[:400], lang, source_name)
            img = await extract_image_from_source(entry.link)
            
            text = analysis if analysis else f"💎 <b>{entry.title.upper()}</b>\n\n{entry.link}\n\n📰 Источник: {source_name}"
            
            try:
                if img: await message.answer_photo(img)
                await message.answer(text, parse_mode="HTML", disable_web_page_preview=True)
                sent += 1
                await asyncio.sleep(1)
            except Exception as e:
                logging.error(f"Error sending news: {e}")

@dp.message(F.text == "🧠 VERO News Analysis")
async def btn_analysis(message: types.Message):
    await message.answer("🧠 <b>VERO News Analysis</b>\n\nНовые разборы приходят автоматически каждые 10 минут.", parse_mode="HTML")

@dp.message(F.text == "📊 Live Report")
async def btn_report(message: types.Message):
    await message.answer("📊 <b>Live Report</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00\nTotal Burned: 0 VERO", parse_mode="HTML")

@dp.message(F.text == "💎 VERO Exclusive")
async def btn_exclusive(message: types.Message):
    await message.answer("💎 <b>VERO Exclusive</b>\n\nДоступ закрыт. Требуется 1,000,000 VERO на балансе.", parse_mode="HTML")

@dp.message(F.text == "ℹ️ About VERO")
async def btn_about(message: types.Message):
    await message.answer("ℹ️ <b>About VERO</b>\n\nVERO — это медиа-актив, где доходы от рекламы идут на выкуп токена.", parse_mode="HTML")

@dp.message(F.text == "👤 My Profile")
async def btn_profile(message: types.Message):
    await message.answer(f"👤 <b>Profile</b>\n\nID: <code>{message.from_user.id}</code>\nStatus: Free User", parse_mode="HTML")

@dp.message(F.text == "⚙️ Settings")
async def btn_settings(message: types.Message):
    await message.answer("⚙️ <b>Settings</b>\n\nИспользуйте /start для смены языка.", parse_mode="HTML")

async def handle(request): return web.Response(text="Alive")

async def main():
    db.init_db()
    await bot.delete_webhook(drop_pending_updates=True)
    app = web.Application()
    app.router.add_get("/", handle)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", 10000).start()
    asyncio.create_task(start_autoposter(bot))
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
