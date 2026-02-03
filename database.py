import asyncio
import logging
import feedparser
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter, RSS_FEEDS
from ai_engine import analyze_and_style_news, extract_image_from_source
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_main_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🧠 VERO News Analysis"), KeyboardButton(text="📊 Live Report")],
            [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="ℹ️ About VERO")],
            [KeyboardButton(text="👤 My Profile"), KeyboardButton(text="⚙️ Settings")]
        ],
        resize_keyboard=True
    )

def get_settings_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🌍 Change Language"), KeyboardButton(text="🙈 Hide Keyboard")],
            [KeyboardButton(text="⬅️ Back")]
        ],
        resize_keyboard=True
    )

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇷🇺 Русский"), KeyboardButton(text="🇺🇸 English")],
            [KeyboardButton(text="🇪🇸 Español"), KeyboardButton(text="🇩🇪 Deutsch")]
        ], 
        resize_keyboard=True
    )
    await message.answer("<b>VERO | Media-Backed Asset</b>\n\nChoose language / Выберите язык:", reply_markup=kb, parse_mode="HTML")

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_lang(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)
    
    welcome = {
        "ru": "👋 Добро пожаловать в VERO!",
        "en": "👋 Welcome to VERO!",
        "es": "👋 ¡Bienvenido a VERO!",
        "de": "👋 Willkommen bei VERO!"
    }
    wait_msg = {
        "ru": "⏳ Анализирую последние новости...",
        "en": "⏳ Analyzing latest news...",
        "es": "⏳ Analizando las últimas noticias...",
        "de": "⏳ Analysiere aktuelle Nachrichten..."
    }
    
    await message.answer(welcome[lang], reply_markup=get_main_menu())
    msg = await message.answer(wait_msg[lang])
    
    # Выдача 3 новостей
    sent = 0
    for source_name, feed_url in RSS_FEEDS.items():
        if sent >= 3: break
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:5]:
            if sent >= 3: break
            analysis = await analyze_and_style_news(entry.title, entry.summary[:400], lang, source_name)
            img = await extract_image_from_source(entry.link)
            text = analysis if analysis else f"📢 <b>{entry.title}</b>\n\n{entry.link}\n\n📰 <b>Источник:</b> {source_name}"
            try:
                if img:
                    await message.answer_photo(img, caption=text[:1024], parse_mode="HTML")
                else:
                    await message.answer(text, parse_mode="HTML")
                sent += 1
            except: continue
            await asyncio.sleep(1)
    await msg.delete()

@dp.message(F.text == "⚙️ Settings")
async def settings(message: types.Message):
    await message.answer("Settings:", reply_markup=get_settings_menu())

@dp.message(F.text == "🙈 Hide Keyboard")
async def hide(message: types.Message):
    await message.answer("Кнопки скрыты. Напишите /start чтобы вернуть.", reply_markup=ReplyKeyboardRemove())

@dp.message(F.text == "⬅️ Back")
async def back(message: types.Message):
    await message.answer("Main Menu", reply_markup=get_main_menu())

@dp.message(F.text == "🧠 VERO News Analysis")
async def analysis(message: types.Message):
    await message.answer("🧠 <b>VERO News Analysis</b>\n\nНовые разборы приходят сюда автоматически.", parse_mode="HTML")

@dp.message(F.text == "📊 Live Report")
async def report(message: types.Message):
    await message.answer("📊 <b>Live Report</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00", parse_mode="HTML")

@dp.message(F.text == "👤 My Profile")
async def profile(message: types.Message):
    await message.answer(f"👤 <b>Profile</b>\nID: {message.from_user.id}", parse_mode="HTML")

@dp.message(F.text == "💎 VERO Exclusive")
async def exclusive(message: types.Message):
    await message.answer("🔒 Requires 1,000,000 VERO tokens.", parse_mode="HTML")

@dp.message(F.text == "ℹ️ About VERO")
async def about(message: types.Message):
    await message.answer("ℹ️ <b>About VERO</b>\n\nVERO — медиа-актив, обеспеченный реальной экономикой.", parse_mode="HTML")

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
