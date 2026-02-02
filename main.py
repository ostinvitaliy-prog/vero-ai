import logging
import asyncio
import feedparser
import httpx
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# --- CONFIG ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"
CHANNEL_ID = "@vero_ai_news" # Замени на свой канал

LANGUAGES = {
    'ru': 'Russian',
    'en': 'English',
    'es': 'Spanish',
    'de': 'German'
}

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None

# --- AI ENGINE ---
async def analyze_news_ai(title, description, lang_name):
    prompt = f"""
    ROLE: VERO Media-Backed Asset Insider.
    TASK: Create a sharp, "expensive" crypto post in {lang_name}.
    
    CONTEXT: VERO is a media-backed asset. Every ad dollar buys back the token.
    NEWS: {title} - {description}

    FORMAT:
    1. ⚡️ [CATCHY UPPERCASE HEADLINE]
    2. [2-3 sentences of pure alpha. Bold facts.]
    3. 💎 VERO VERDICT: [Insider market impact.]
    4. #VERO #Crypto #{lang_name[:2].upper()}
    
    Style: Bold, expert, no fluff.
    """
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return resp.json()['choices'][0]['message']['content']
        except: return None

# --- KEYBOARDS ---
def main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="📊 Live Report"), types.KeyboardButton(text="💎 VERO Exclusive"))
    builder.row(types.KeyboardButton(text="📢 Free Feed"), types.KeyboardButton(text="👤 My Profile"))
    return builder.as_markup(resize_keyboard=True)

# --- HANDLERS ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    welcome_text = (
        "🦾 **VERO | Media-Backed Asset**\n\n"
        "Мы делаем новости — ты получаешь профит.\n"
        "Доходы от рекламы идут на выкуп токена $VERO с рынка.\n\n"
        "Выбери раздел:"
    )
    await message.answer(welcome_text, reply_markup=main_menu(), parse_mode="Markdown")

@dp.message(F.text == "📊 Live Report")
async def live_report(message: types.Message):
    report = (
        "📈 **VERO Live Transparency**\n\n"
        "💰 Ad Revenue: $0.00\n"
        "🔥 Buyback Fund: $0.00\n"
        "💎 Total Distributed: 0 VERO\n"
        "👥 Holders: 1 (You are early!)\n\n"
        "Вся прибыль идет в график. Мы в одной лодке."
    )
    await message.answer(report, parse_mode="Markdown")

@dp.message(F.text == "💎 VERO Exclusive")
async def exclusive_access(message: types.Message):
    await message.answer("🔒 **Доступ закрыт.**\n\nДля входа в Exclusive нужно иметь на балансе **1,000,000 VERO**.\nКупи актив и качай его вместе с нами.")

# --- AUTOPOSTING JOB ---
async def auto_post_job():
    global last_posted_link
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if not feed.entries or feed.entries[0].link == last_posted_link:
        return
    
    entry = feed.entries[0]
    last_posted_link = entry.link
    image_url = entry.media_content[0]['url'] if 'media_content' in entry else None

    for lang_code, lang_name in LANGUAGES.items():
        report = await analyze_news_ai(entry.title, entry.description, lang_name)
        if report:
            try:
                text = f"{report}\n\n🔗 [Source]({entry.link})"
                if image_url:
                    await bot.send_photo(CHANNEL_ID, photo=image_url, caption=text, parse_mode="Markdown")
                else:
                    await bot.send_message(CHANNEL_ID, text=text, parse_mode="Markdown")
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"Error: {e}")

# --- MAIN ---
async def main():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(auto_post_job, "interval", minutes=30)
    scheduler.start()
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(dp)

if __name__ == '__main__':
    asyncio.run(main())
