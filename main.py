import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

def get_lang_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="🇷🇺 Русский", callback_data="set_lang_ru")
    builder.button(text="🇺🇸 English", callback_data="set_lang_en")
    builder.button(text="🇪🇸 Español", callback_data="set_lang_es")
    builder.button(text="🇩🇪 Deutsch", callback_data="set_lang_de")
    builder.adjust(2)
    return builder.as_markup()

def get_main_menu():
    builder = InlineKeyboardBuilder()
    builder.button(text="📢 Free Feed", callback_data="menu_feed")
    builder.button(text="📊 Live Report", callback_data="menu_report")
    builder.button(text="💎 VERO Exclusive", callback_data="menu_exclusive")
    builder.button(text="👤 My Profile", callback_data="menu_profile")
    builder.adjust(2)
    return builder.as_markup()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer("Choose your language / Выберите язык:", reply_markup=get_lang_keyboard())

@dp.callback_query(F.data.startswith("set_lang_"))
async def set_language(callback: types.CallbackQuery):
    lang = callback.data.split("_")[2]
    db.save_user(callback.from_user.id, lang)
    
    welcome_texts = {
        "ru": "🦾 <b>VERO AI активирован.</b>\n\nМы агрегируем главные новости мира и даем экспертный разбор: что это значит для рынка и какие есть сценарии.\n\nЛови последние инсайды:",
        "en": "🦾 <b>VERO AI activated.</b>\n\nWe aggregate global news and provide expert analysis: what it means for the market and potential scenarios.\n\nLatest insights:",
        "es": "🦾 <b>VERO AI activado.</b>\n\nAgregamos noticias globales y brindamos análisis experto.\n\nÚltimas noticias:",
        "de": "🦾 <b>VERO AI aktiviert.</b>\n\nWir aggregieren globale Nachrichten und bieten Expertenanalysen.\n\nAktuelle Einblicke:"
    }
    
    await callback.message.answer(welcome_texts.get(lang, welcome_texts['en']), parse_mode="HTML")
    
    # Сразу выдаем 3 последние новости из базы
    latest = db.get_latest_news(lang, limit=3)
    if latest:
        for text, link in reversed(latest):
            await callback.message.answer(f"{text}\n\n🔗 <a href='{link}'>Source</a>", parse_mode="HTML", disable_web_page_preview=True)
            await asyncio.sleep(0.5)
    else:
        await callback.message.answer("📭 No news in database yet. Waiting for the first big update...")

    await callback.message.answer("<b>Main Menu:</b>", reply_markup=get_main_menu(), parse_mode="HTML")
    await callback.answer()

@dp.callback_query(F.data == "menu_feed")
async def show_feed(callback: types.CallbackQuery):
    # Здесь можно просто напомнить, что новости приходят автоматически, или дать последние 5
    await callback.message.answer("📢 You are subscribed to the Free Feed. New expert analysis will arrive here automatically.")
    await callback.answer()

# Остальные хендлеры (report, profile и т.д.) остаются как были...

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
