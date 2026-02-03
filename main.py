import asyncio
import logging
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import ReplyKeyboardRemove
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
    # ReplyKeyboardRemove() удалит те самые кнопки внизу экрана
    await message.answer("<b>VERO | Media-Backed Asset</b>\n\nChoose your language / Выберите язык:", 
                         reply_markup=get_lang_keyboard(), 
                         parse_mode="HTML")
    # Отправляем невидимое сообщение для удаления старой клавы, если она зависла
    await message.answer("Cleaning interface...", reply_markup=ReplyKeyboardRemove())

@dp.callback_query(F.data.startswith("set_lang_"))
async def set_language(callback: types.CallbackQuery):
    lang = callback.data.split("_")[2]
    db.save_user(callback.from_user.id, lang)
    
    welcome_texts = {
        "ru": "🦾 <b>VERO AI активирован.</b>\n\nМы агрегируем главные новости и даем экспертный разбор.\n\n<b>Последние новости:</b>",
        "en": "🦾 <b>VERO AI activated.</b>\n\nWe aggregate global news and provide expert analysis.\n\n<b>Latest insights:</b>",
        "es": "🦾 <b>VERO AI activado.</b>\n\nAgregamos noticias globales y brindamos análisis experto.\n\n<b>Últimas noticias:</b>",
        "de": "🦾 <b>VERO AI aktiviert.</b>\n\nWir aggregieren globale Nachrichten и bieten Expertenanalysen.\n\n<b>Aktuelle Einblicke:</b>"
    }
    
    await callback.message.answer(welcome_texts.get(lang, welcome_texts['en']), parse_mode="HTML")
    
    latest = db.get_latest_news(lang, limit=3)
    if latest:
        for text, link in reversed(latest):
            await callback.message.answer(f"{text}\n\n🔗 <a href='{link}'>Источник</a>", 
                                         parse_mode="HTML", disable_web_page_preview=True)
            await asyncio.sleep(0.5)
    else:
        await callback.message.answer("📭 База новостей обновляется. Ожидайте первый отчет в течение 10-20 минут.")

    await callback.message.answer("<b>Main Menu:</b>", reply_markup=get_main_menu(), parse_mode="HTML")
    await callback.answer()

# Обработчики кнопок меню
@dp.callback_query(F.data == "menu_feed")
async def show_feed(callback: types.CallbackQuery):
    await callback.message.answer("📢 Вы подписаны на Free Feed. Новые разборы приходят сюда автоматически.")
    await callback.answer()

@dp.callback_query(F.data == "menu_report")
async def show_report(callback: types.CallbackQuery):
    report_text = "📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00\nTotal Burned: 0 VERO"
    await callback.message.answer(report_text, parse_mode="HTML")
    await callback.answer()

@dp.callback_query(F.data == "menu_profile")
async def show_profile(callback: types.CallbackQuery):
    profile_text = f"👤 <b>Profile</b>\nID: {callback.from_user.id}\nBalance: 0 VERO"
    await callback.message.answer(profile_text, parse_mode="HTML")
    await callback.answer()

@dp.callback_query(F.data == "menu_exclusive")
async def show_exclusive(callback: types.CallbackQuery):
    await callback.message.answer("🔒 <b>Access Denied.</b>\n\nRequires 1,000,000 VERO tokens to unlock Exclusive Feed.", parse_mode="HTML")
    await callback.answer()

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
