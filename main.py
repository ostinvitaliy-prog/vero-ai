import logging
import asyncio
import feedparser
import httpx
import sqlite3
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder
from aiohttp import web

# --- КОНФИГ VERO ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None

# --- БАЗА ДАННЫХ (Чтобы бот знал, кому слать новости) ---
def init_db():
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)')
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def get_users():
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM users')
    users = [row[0] for row in cursor.fetchall()]
    conn.close()
    return users

# --- ИИ СТИЛЬ VERO ---
async def analyze_news_ai(title, description):
    prompt = f"ROLE: VERO Media-Backed Asset Insider. TASK: Sharp, bold crypto post in Russian. NEWS: {title} - {description}. FORMAT: 1. ⚡️ HEADLINE. 2. Essence (bold). 3. 💎 VERO VERDICT. 4. #VERO #Crypto"
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

# --- АВТОПОСТЕР (Шлет новости всем пользователям) ---
async def auto_poster():
    global last_posted_link
    while True:
        try:
            feed = feedparser.parse("https://cointelegraph.com/rss")
            if feed.entries:
                entry = feed.entries[0]
                if entry.link != last_posted_link:
                    last_posted_link = entry.link
                    report = await analyze_news_ai(entry.title, entry.description)
                    if report:
                        users = get_users()
                        for user_id in users:
                            try:
                                await bot.send_message(user_id, report, parse_mode="Markdown")
                                await asyncio.sleep(0.1)
                            except: pass
            await asyncio.sleep(1800)
        except: await asyncio.sleep(60)

# --- ВЕБ-СЕРВЕР ДЛЯ RENDER (Чтобы не выключался) ---
async def handle(request): return web.Response(text="VERO Alive")
async def run_web():
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.getenv("PORT", 10000)))
    await site.start()

# --- ЗАПУСК ---
async def main():
    init_db()
    asyncio.create_task(run_web())
    asyncio.create_task(auto_poster())
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
