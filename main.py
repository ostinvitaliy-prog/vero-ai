import logging
import asyncio
import feedparser
import httpx
import sqlite3
import os
import json
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiohttp import web

# --- КОНФИГ VERO ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

logging.basicConfig(level=logging.INFO)
bot = Bot(token=API_TOKEN)
dp = Dispatcher()
last_posted_link = None

# --- БАЗА ДАННЫХ ---
def init_db():
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)')
    # Таблица для хранения истории важных новостей
    cursor.execute('''CREATE TABLE IF NOT EXISTS news_history 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, link TEXT, score INTEGER)''')
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def save_news(content, link, score):
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO news_history (content, link, score) VALUES (?, ?, ?)', (content, link, score))
    # Оставляем только последние 10 новостей в базе, чтобы не раздувать файл
    cursor.execute('DELETE FROM news_history WHERE id NOT IN (SELECT id FROM news_history ORDER BY id DESC LIMIT 10)')
    conn.commit()
    conn.close()

def get_recent_news(limit=3):
    conn = sqlite3.connect('vero.db')
    cursor = conn.cursor()
    cursor.execute('SELECT content, link FROM news_history ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- МЕНЮ ---
def main_menu():
    builder = InlineKeyboardBuilder()
    builder.button(text="📊 Live Report", callback_data="report")
    builder.button(text="💎 VERO Exclusive", callback_data="exclusive")
    builder.button(text="📢 Free Feed", callback_data="feed")
    builder.button(text="👤 My Profile", callback_data="profile")
    builder.adjust(2)
    return builder.as_markup()

# --- ЛОГИКА AI ---
async def process_news_ai(title, description):
    """Оценивает важность и переписывает новость"""
    prompt = (
        f"ROLE: VERO Crypto Insider. TASK: Analyze and rewrite news.\n"
        f"NEWS: {title} - {description}\n\n"
        f"JSON OUTPUT FORMAT ONLY:\n"
        f"{{\"score\": 1-10, \"content\": \"Sharp, bold post in Russian with ⚡️ HEADLINE, Essence, 💎 VERO VERDICT, #VERO #Crypto\"}}"
    )
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}}
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            data = json.loads(resp.json()['choices'][0]['message']['content'])
            return data # {'score': 8, 'content': '...'}
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return None

# --- ОБРАБОТЧИКИ ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    add_user(message.from_user.id)
    welcome_text = (
        "🦾 **VERO | Media-Backed Asset**\n\n"
        "Мы делаем новости — ты получаешь профит.\n"
        "Доходы от рекламы идут на выкуп токена $VERO.\n\n"
        "🔥 **Последняя альфа:**"
    )
    await message.answer(welcome_text, parse_mode="Markdown")
    
    # Сразу кидаем последние 3 новости
    recent = get_recent_news(3)
    if recent:
        for content, link in reversed(recent):
            await message.answer(f"{content}\n\n🔗 [Источник]({link})", parse_mode="Markdown", disable_web_page_preview=True)
    else:
        await message.answer("⏳ Анализируем рынок... Свежие новости появятся здесь в ближайшее время.")
        
    await message.answer("Выбери раздел:", reply_markup=main_menu())

@dp.callback_query(F.data == "feed")
async def show_feed(callback: types.CallbackQuery):
    recent = get_recent_news(3)
    if recent:
        await callback.message.answer("📢 **Последние важные события:**")
        for content, link in recent:
            await callback.message.answer(f"{content}\n\n🔗 [Источник]({link})", parse_mode="Markdown", disable_web_page_preview=True)
    else:
        await callback.message.answer("📰 Новостей пока нет. Ждем важный инфоповод.")
    await callback.answer()

@dp.callback_query(F.data == "report")
async def show_report(callback: types.CallbackQuery):
    text = "📈 **VERO Live Transparency**\n\n💰 Ad Revenue: $0.00\n🔥 Buyback Fund: $0.00\n💎 Total Distributed: 0 VERO\n\nВся прибыль идет в график."
    await callback.message.answer(text, parse_mode="Markdown")
    await callback.answer()

@dp.callback_query(F.data == "exclusive")
async def show_exclusive(callback: types.CallbackQuery):
    await callback.message.answer("🔒 **Доступ закрыт.**\n\nНужно иметь на балансе **1,000,000 VERO**.", parse_mode="Markdown")
    await callback.answer()

@dp.callback_query(F.data == "profile")
async def show_profile(callback: types.CallbackQuery):
    await callback.message.answer(f"👤 **Твой профиль**\n\n🆔 ID: `{callback.from_user.id}`\n💰 Баланс: 0 VERO", parse_mode="Markdown")
    await callback.answer()

# --- АВТОПОСТЕР ---
async def auto_poster():
    global last_posted_link
    while True:
        try:
            feed = feedparser.parse("https://cointelegraph.com/rss")
            if feed.entries:
                entry = feed.entries[0]
                if entry.link != last_posted_link:
                    last_posted_link = entry.link
                    # AI Анализ
                    result = await process_news_ai(entry.title, entry.description)
                    
                    if result and result.get('score', 0) >= 7:
                        content = result['content']
                        score = result['score']
                        
                        # Сохраняем в историю
                        save_news(content, entry.link, score)
                        
                        # Рассылаем всем
                        conn = sqlite3.connect('vero.db')
                        cursor = conn.cursor()
                        cursor.execute('SELECT user_id FROM users')
                        users = [row[0] for row in cursor.fetchall()]
                        conn.close()
                        
                        for user_id in users:
                            try:
                                await bot.send_message(user_id, f"{content}\n\n🔗 [Источник]({entry.link})", parse_mode="Markdown", disable_web_page_preview=True)
                                await asyncio.sleep(0.1)
                            except: pass
            
            await asyncio.sleep(600) # Проверка каждые 10 минут
        except Exception as e:
            logging.error(f"Poster Error: {e}")
            await asyncio.sleep(60)

# --- ВЕБ-СЕРВЕР ---
async def handle(request): return web.Response(text="VERO Alive")
async def run_web():
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.getenv("PORT", 10000)))
    await site.start()

async def main():
    init_db()
    asyncio.create_task(run_web())
    asyncio.create_task(auto_poster())
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
