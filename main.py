import logging
import asyncio
import feedparser
import httpx
import sqlite3
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiohttp import web

# --- КОНФИГ VERO ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

LANGUAGES = {'ru': 'Russian', 'en': 'English', 'es': 'Spanish', 'de': 'German'}

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None

# --- БАЗА ДАННЫХ ---
def init_db():
    conn = sqlite3.connect('vero_users.db')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)')
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect('vero_users.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect('vero_users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM users')
    users = [row[0] for row in cursor.fetchall()]
    conn.close()
    return users

# --- ИИ ДВИЖОК ---
async def analyze_news_ai(title, description, lang_name):
    prompt = f"ROLE: VERO Media-Backed Asset Insider. TASK: Sharp, bold crypto post in {lang_name}. NEWS: {title} - {description}. FORMAT: 1. ⚡️ HEADLINE. 2. Essence (bold). 3. 💎 VERO VERDICT. 4. #VERO #Crypto"
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.5}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return resp.json()['choices'][0]['message']['content']
        except: return None

# --- МЕНЮ ---
def main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="📊 Live Report"), types.KeyboardButton(text="💎 VERO Exclusive"))
    builder.row(types.KeyboardButton(text="📢 Free Feed"), types.KeyboardButton(text="👤 My Profile"))
    return builder.as_markup(resize_keyboard=True)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    add_user(message.from_user.id)
    await message.answer("🦾 **VERO | Media-Backed Asset**\n\nМы делаем новости — ты получаешь профит.", reply_markup=main_menu(), parse_mode="Markdown")

# --- АВТОПОСТИНГ ---
async def auto_post_job():
    global last_posted_link
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if not feed.entries or feed.entries[0].link == last_posted_link: return
    last_posted_link = feed.entries[0].link
    entry = feed.entries[0]
    
    image_url = entry.media_content[0]['url'] if 'media_content' in entry else None
    users = get_all_users()
    report = await analyze_news_ai(entry.title, entry.description, "Russian")
    
    if report:
        text = f"{report}\n\n🔗 [Source]({entry.link})"
        for user_id in users:
            try:
                if image_url: await bot.send_photo(user_id, photo=image_url, caption=text, parse_mode="Markdown")
                else: await bot.send_message(user_id, text=text, parse_mode="Markdown")
                await asyncio.sleep(0.1)
            except: pass

# --- WEB SERVER FOR RENDER ---
async def handle(request):
    return web.Response(text="VERO Engine is running")

async def run_web_server():
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.getenv("PORT", 10000)))
    await site.start()

# --- MAIN ---
async def main():
    init_db()
    # Запуск веб-сервера на фоне для Render
    asyncio.create_task(run_web_server())
    
    scheduler = AsyncIOScheduler()
    scheduler.add_job(auto_post_job, "interval", minutes=30)
    scheduler.start()
    
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
