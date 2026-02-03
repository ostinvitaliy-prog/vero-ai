import asyncio
import logging
import feedparser
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter, RSS_FEEDS
from ai_engine import analyze_and_style_news
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_lang_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇷🇺 Русский"), KeyboardButton(text="🇺🇸 English")],
            [KeyboardButton(text="🇪🇸 Español"), KeyboardButton(text="🇩🇪 Deutsch")]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )

def get_main_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🧠 VERO News Analysis"), KeyboardButton(text="📊 Live Report")],
            [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="ℹ️ About VERO")],
            [KeyboardButton(text="👤 My Profile"), KeyboardButton(text="⚙️ Settings")]
        ],
        resize_keyboard=True,
        is_persistent=True
    )

def get_settings_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🌍 Change Language")],
            [KeyboardButton(text="🙈 Hide Keyboard")],
            [KeyboardButton(text="⬅️ Back")]
        ],
        resize_keyboard=True
    )

WELCOME_MESSAGES = {
    "ru": "👋 <b>Добро пожаловать в VERO</b>\n\nVERO — это AI-медиа о криптовалютах. Мы объясняем смысл новостей.\n\n🧠 <b>Что вы получаете:</b>\n• Отбор ключевых новостей\n• Краткий разбор и 2 сценария\n• Мнение VERO AI\n\nЭто новостная аналитика. Только смысл.",
    "en": "👋 <b>Welcome to VERO</b>\n\nVERO is an AI-powered crypto media. We explain the meaning behind the news.\n\n🧠 <b>What you get:</b>\n• Curated key news\n• Breakdown and 2 scenarios\n• VERO AI verdict\n\nThis is news intelligence. Just meaning."
}

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer("<b>VERO | Media-Backed Asset</b>\n\nChoose language / Выберите язык:", reply_markup=get_lang_keyboard(), parse_mode="HTML")

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_language(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)

    await message.answer(WELCOME_MESSAGES.get(lang, WELCOME_MESSAGES["en"]), parse_mode="HTML", reply_markup=get_main_menu())
    
    header = "🗞 <b>Вот последние 3 новости в формате VERO AI:</b>" if lang == "ru" else "🗞 <b>Latest 3 news in VERO AI format:</b>"
    await message.answer(header, parse_mode="HTML")

    sent = 0
    # Берем новости и ЖДЕМ анализа
    for feed_url in RSS_FEEDS:
        if sent >= 3: break
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:10]:
            if sent >= 3: break
            
            # Пытаемся получить именно AI формат
            analysis = await analyze_and_style_news(entry.title, entry.summary[:400], entry.link)
            
            if analysis and analysis.get(lang):
                await message.answer(f"{analysis[lang]}\n\n🔗 <a href='{entry.link}'>Source</a>", parse_mode="HTML", disable_web_page_preview=False)
                sent += 1
                # Сохраняем в базу чтобы не дублировать в автопостинге
                db.save_news(analysis.get('ru'), analysis.get('en'), analysis.get('es'), analysis.get('de'), entry.link, 7)
            else:
                # Если AI совсем не ответил, пробуем следующую новость, чтобы не слать пустой RSS
                continue
            
            await asyncio.sleep(1)

@dp.message(F.text == "⚙️ Settings")
async def show_settings(message: types.Message):
    await message.answer("⚙️ Settings / Настройки:", reply_markup=get_settings_menu())

@dp.message(F.text == "🌍 Change Language")
async def change_lang(message: types.Message):
    await message.answer("Choose language / Выберите язык:", reply_markup=get_lang_keyboard())

@dp.message(F.text == "🙈 Hide Keyboard")
async def hide_kb(message: types.Message):
    await message.answer("🙈 Кнопки скрыты. Чтобы вернуть меню, отправьте /start", reply_markup=ReplyKeyboardRemove())

@dp.message(F.text == "⬅️ Back")
async def back(message: types.Message):
    await message.answer("⬅️", reply_markup=get_main_menu())

@dp.message(F.text == "🧠 VERO News Analysis")
async def news_info(message: types.Message):
    await message.answer("🧠 <b>VERO News Analysis</b>\n\nНовые разборы приходят сюда автоматически.", parse_mode="HTML")

@dp.message(F.text == "ℹ️ About VERO")
async def about_info(message: types.Message):
    await message.answer("ℹ️ <b>About VERO</b>\n\nVERO — это медиа-актив, обеспеченный реальной экономикой.", parse_mode="HTML")

@dp.message(F.text == "📊 Live Report")
async def report(message: types.Message):
    await message.answer("📈 <b>Live Report</b>\n\nAd Revenue: $0.00", parse_mode="HTML")

@dp.message(F.text == "👤 My Profile")
async def profile(message: types.Message):
    await message.answer(f"👤 <b>Profile</b>\nID: {message.from_user.id}", parse_mode="HTML")

@dp.message(F.text == "💎 VERO Exclusive")
async def exclusive(message: types.Message):
    await message.answer("🔒 Requires 1,000,000 VERO.", parse_mode="HTML")

async def handle(request):
    return web.Response(text="Alive")

async def main():
    db.init_db()
    app = web.Application()
    app.router.add_get("/", handle)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", 10000).start()
    asyncio.create_task(start_autoposter(bot))
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
