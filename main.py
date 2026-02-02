import logging
import asyncio
import feedparser
import httpx
import sqlite3
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import ReplyKeyboardBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# --- КОНФИГ VERO ---
API_TOKEN = '8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ'
ROUTEL_API_KEY = 's2_4b5416fae8a44bc7b97dd7bd65bb0f3b'
BASE_URL = "https://routellm.abacus.ai/v1"

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

# --- БАЗА ДАННЫХ (Для рассылки новостей пользователям) ---
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

# --- ИИ ДВИЖОК VERO ---
async def analyze_news_ai(title, description, lang_name):
    prompt = f"""
    ROLE: VERO Media-Backed Asset Insider Editor.
    TASK: Create a sharp, bold crypto post in {lang_name}.
    CONTEXT: VERO is a media-backed asset. Ad revenue buys back $VERO.
    NEWS: {title} - {description}
    FORMAT:
    1. ⚡️ [CATCHY UPPERCASE HEADLINE]
    2. [2-3 sentences of pure essence. Bold facts.]
    3. 💎 VERO VERDICT: [Insider market impact.]
    4. #VERO #Crypto #{lang_name[:2].upper()}
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

# --- МЕНЮ ---
def main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="📊 Live Report"), types.KeyboardButton(text="💎 VERO Exclusive"))
    builder.row(types.KeyboardButton(text="📢 Free Feed"), types.KeyboardButton(text="👤 My Profile"))
    return builder.as_markup(resize_keyboard=True)

# --- ОБРАБОТКА ---
@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    add_user(message.from_user.id)
    welcome_text = (
        "🦾 **VERO | Media-Backed Asset**\n\n"
        "Мы делаем новости — ты получаешь профит.\n"
        "Доходы от рекламы идут на выкуп токена $VERO с рынка.\n\n"
        "**Твой профит:**\n"
        "• Цена растет: Бот выкупает токен.\n"
        "• Монет больше: Распределение между холдерами.\n"
        "• Честность: У нас только 10% монет.\n\n"
        "Выбери раздел:"
    )
    await message.answer(welcome_text, reply_markup=main_menu(), parse_mode="Markdown")

@dp.message(F.text == "📊 Live Report")
async def live_report(message: types.Message):
    await message.answer("📈 **VERO Live Transparency**\n\n💰 Ad Revenue: $0.00\n🔥 Buyback Fund: $0.00\n💎 Total Distributed: 0 VERO\n👥 Holders: 1\n\nВся прибыль идет в график.", parse_mode="Markdown")

@dp.message(F.text == "💎 VERO Exclusive")
async def exclusive_access(message: types.Message):
    await message.answer("🔒 **Доступ закрыт.**\n\nНужно иметь на балансе **1,000,000 VERO**.\nКупи актив и качай его вместе с нами.", parse_mode="Markdown")

@dp.message(F.text == "📢 Free Feed")
async def free_feed(message: types.Message):
    await message.answer("📰 **Free Feed:** Главные новости дня приходят сюда автоматически.\n\nОжидай свежую альфу.")

@dp.message(F.text == "👤 My Profile")
async def my_profile(message: types.Message):
    await message.answer(f"👤 **Твой профиль**\n\n🆔 ID: `{message.from_user.id}`\n💰 Баланс: 0 VERO\n\nWelcome Drop скоро!", parse_mode="Markdown")

# --- АВТОПОСТИНГ ПРЯМО В БОТА ---
async def auto_post_job():
    global last_posted_link
    feed = feedparser.parse("https://cointelegraph.com/rss")
    if not feed.entries or feed.entries[0].link == last_posted_link: return
    
    entry = feed.entries[0]
    last_posted_link = entry.link
    image_url = entry.media_content[0]['url'] if 'media_content' in entry else None
    
    users = get_all_users()
    
    # Генерируем пост (пока только RU для примера, можно цикл по языкам)
    report = await analyze_news_ai(entry.title, entry.description, "Russian")
    if report:
        text = f"{report}\n\n🔗 [Source]({entry.link})"
        for user_id in users:
            try:
                if image_url:
                    await bot.send_photo(user_id, photo=image_url, caption=text, parse_mode="Markdown")
                else:
                    await bot.send_message(user_id, text=text, parse_mode="Markdown")
                await asyncio.sleep(0.05) # Защита от спам-фильтра Telegram
            except: pass

# --- ЗАПУСК ---
async def main():
    init_db()
    scheduler = AsyncIOScheduler()
    scheduler.add_job(auto_post_job, "interval", minutes=30)
    scheduler.start()
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
