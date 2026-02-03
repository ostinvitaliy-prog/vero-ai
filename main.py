import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_lang_keyboard():
    """Клавиатура выбора языка (одноразовая)"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇷🇺 Русский"), KeyboardButton(text="🇺🇸 English")],
            [KeyboardButton(text="🇪🇸 Español"), KeyboardButton(text="🇩🇪 Deutsch")]
        ],
        resize_keyboard=True,
        one_time_keyboard=True
    )
    return keyboard

def get_main_menu():
    """Главное меню - постоянные кнопки внизу"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📢 Free Feed"), KeyboardButton(text="📊 Live Report")],
            [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="👤 My Profile")]
        ],
        resize_keyboard=True,
        is_persistent=True
    )
    return keyboard

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "<b>VERO | Media-Backed Asset</b>\n\nChoose your language / Выберите язык:", 
        reply_markup=get_lang_keyboard(), 
        parse_mode="HTML"
    )

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_language(message: types.Message):
    lang_map = {
        "🇷🇺 Русский": "ru",
        "🇺🇸 English": "en",
        "🇪🇸 Español": "es",
        "🇩🇪 Deutsch": "de"
    }
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)
    
    welcome_texts = {
        "ru": "🦾 <b>VERO AI активирован.</b>\n\nМы агрегируем главные новости и даем экспертный разбор.\n\n<b>Последние новости:</b>",
        "en": "🦾 <b>VERO AI activated.</b>\n\nWe aggregate global news and provide expert analysis.\n\n<b>Latest insights:</b>",
        "es": "🦾 <b>VERO AI activado.</b>\n\nAgregamos noticias globales y brindamos análisis experto.\n\n<b>Últimas noticias:</b>",
        "de": "🦾 <b>VERO AI aktiviert.</b>\n\nWir aggregieren globale Nachrichten и bieten Expertenanalysen.\n\n<b>Aktuelle Einblicke:</b>"
    }
    
    await message.answer(welcome_texts.get(lang, welcome_texts['en']), parse_mode="HTML")
    
    latest = db.get_latest_news(lang, limit=3)
    if latest:
        for text, link in reversed(latest):
            await message.answer(f"{text}\n\n🔗 <a href='{link}'>Источник</a>", 
                                parse_mode="HTML", disable_web_page_preview=True)
            await asyncio.sleep(0.5)
    else:
        await message.answer("📭 База новостей обновляется. Ожидайте первый отчет в течение 10-20 минут.")

    await message.answer("<b>Main Menu:</b>", reply_markup=get_main_menu(), parse_mode="HTML")

# Обработчики кнопок меню
@dp.message(F.text == "📢 Free Feed")
async def show_feed(message: types.Message):
    await message.answer("📢 Вы подписаны на Free Feed. Новые разборы приходят сюда автоматически.")

@dp.message(F.text == "📊 Live Report")
async def show_report(message: types.Message):
    report_text = "📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00\nTotal Burned: 0 VERO"
    await message.answer(report_text, parse_mode="HTML")

@dp.message(F.text == "👤 My Profile")
async def show_profile(message: types.Message):
    profile_text = f"👤 <b>Profile</b>\nID: {message.from_user.id}\nBalance: 0 VERO"
    await message.answer(profile_text, parse_mode="HTML")

@dp.message(F.text == "💎 VERO Exclusive")
async def show_exclusive(message: types.Message):
    await message.answer("🔒 <b>Access Denied.</b>\n\nRequires 1,000,000 VERO tokens to unlock Exclusive Feed.", parse_mode="HTML")

async def handle(request):
    return web.Response(text="VERO Engine Alive")

async def main():
    db.init_db()
    app = web.Application()
    app.router.add_get("/", handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 10000)
    asyncio.create_task(site.start())
    
    asyncio.create_task(start_autoposter(bot))
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
