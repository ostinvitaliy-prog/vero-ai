import asyncio
import logging
import feedparser
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
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
            [KeyboardButton(text="🤖 VERO AI"), KeyboardButton(text="📊 Live Report")],
            [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="👤 My Profile")]
        ],
        resize_keyboard=True,
        is_persistent=True
    )

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "<b>VERO | Media-Backed Asset</b>\n\nChoose your language / Выберите язык:", 
        reply_markup=get_lang_keyboard(), 
        parse_mode="HTML"
    )

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_language(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)
    
    await message.answer(
        "🦾 <b>VERO AI активирован.</b>\n\nПодбираю для вас 3 актуальных разбора рынка...", 
        parse_mode="HTML", 
        reply_markup=get_main_menu()
    )

    count = 0
    for feed_url in RSS_FEEDS:
        if count >= 3: break
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]:
                if count >= 3: break
                
                analysis = await analyze_and_style_news(entry.title, entry.summary[:300], entry.link)
                
                if analysis and analysis.get('score', 0) >= 7:
                    # Берём уже готовый отформатированный текст из AI
                    post_text = analysis.get(lang, analysis.get('en', ''))
                    
                    # Добавляем ссылку на источник
                    final_post = f"{post_text}\n\n🔗 <a href='{entry.link}'>Source</a>"
                    
                    await message.answer(final_post, parse_mode="HTML", disable_web_page_preview=False)
                    
                    # Сохраняем в базу
                    if not db.is_news_posted(entry.link):
                        db.save_news(
                            analysis.get('ru', ''),
                            analysis.get('en', ''),
                            analysis.get('es', ''),
                            analysis.get('de', ''),
                            entry.link,
                            analysis.get('score', 7)
                        )
                    
                    count += 1
                    await asyncio.sleep(2)
        except Exception as e:
            logging.error(f"Error in onboarding: {e}")
    
    if count == 0:
        await message.answer("📭 Обновление базы... Первые разборы придут в течение 5-10 минут.")

@dp.message(F.text == "🤖 VERO AI")
async def show_feed(message: types.Message):
    await message.answer("🤖 <b>VERO AI Feed</b>\n\nВы подписаны на экспертную аналитику. Новые разборы приходят автоматически.", parse_mode="HTML")

@dp.message(F.text == "📊 Live Report")
async def show_report(message: types.Message):
    await message.answer("📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00\nTotal Burned: 0 VERO", parse_mode="HTML")

@dp.message(F.text == "👤 My Profile")
async def show_profile(message: types.Message):
    await message.answer(f"👤 <b>Profile</b>\nID: {message.from_user.id}\nBalance: 0 VERO", parse_mode="HTML")

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
