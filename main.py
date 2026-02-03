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
            [KeyboardButton(text="🧠 VERO News Analysis"), KeyboardButton(text="📊 Live Report")],
            [KeyboardButton(text="💎 VERO Exclusive"), KeyboardButton(text="ℹ️ About VERO")],
            [KeyboardButton(text="👤 My Profile"), KeyboardButton(text="⚙️ Settings")]
        ],
        resize_keyboard=True,
        is_persistent=True
    )

WELCOME_MESSAGES = {
    "ru": """👋 <b>Добро пожаловать в VERO</b>

VERO — это AI-медиа о криптовалютах и Web3.
Мы не просто показываем новости — мы объясняем, что они значат и для кого они важны.

🧠 <b>Что вы получаете:</b>
• Отбор ключевых новостей
• Краткий разбор без шума
• 2 сценария развития событий
• Мнение VERO AI

Это новостная аналитика, а не обзор рынка.
Без сигналов. Без пампа. Только смысл.

👇 Ниже — последние важные новости""",
    
    "en": """👋 <b>Welcome to VERO</b>

VERO is an AI-powered crypto & Web3 media.
We don't just show news — we explain what it means and who should care.

🧠 <b>What you get:</b>
• Curated key news
• Clear breakdown without noise
• 2 development scenarios
• VERO AI verdict

This is news intelligence, not market overview.
No signals. No hype. Just meaning.

👇 Latest important news below""",
    
    "es": """👋 <b>Bienvenido a VERO</b>

VERO es un medio de cripto y Web3 impulsado por IA.
No solo mostramos noticias — explicamos qué significan y para quién son importantes.

🧠 <b>Lo que obtienes:</b>
• Selección de noticias clave
• Análisis claro sin ruido
• 2 escenarios de desarrollo
• Veredicto de VERO AI

Esto es inteligencia de noticias, no resumen de mercado.
Sin señales. Sin hype. Solo significado.

👇 Últimas noticias importantes abajo""",
    
    "de": """👋 <b>Willkommen bei VERO</b>

VERO ist ein KI-gestütztes Krypto- & Web3-Medium.
Wir zeigen nicht nur Nachrichten — wir erklären, was sie bedeuten und für wen sie wichtig sind.

🧠 <b>Was Sie bekommen:</b>
• Kuratierte Schlüsselnachrichten
• Klare Analyse ohne Rauschen
• 2 Entwicklungsszenarien
• VERO AI Urteil

Dies ist News Intelligence, keine Marktübersicht.
Keine Signale. Kein Hype. Nur Bedeutung.

👇 Neueste wichtige Nachrichten unten"""
}

ABOUT_MESSAGES = {
    "ru": """ℹ️ <b>О проекте VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO — это не просто новостной бот.
Это медиа-актив, обеспеченный реальной экономикой.

🔹 <b>Как это работает:</b>

1️⃣ <b>Контент</b>
VERO AI анализирует тысячи источников и отбирает только важные новости. Каждая новость проходит через AI-редактора, который объясняет смысл и последствия.

2️⃣ <b>Монетизация</b>
Реклама в боте → доход → buyback токенов VERO → распределение холдерам.

3️⃣ <b>Прозрачность</b>
Все данные о доходах, buyback и распределении публикуются в Live Report.

4️⃣ <b>Эксклюзив</b>
Держатели 1,000,000 VERO получают доступ к VERO Exclusive — глубокой аналитике и инсайдам.

🎯 <b>Цель:</b>
Создать медиа-актив, который растёт вместе с аудиторией и приносит реальную ценность держателям токенов.

📊 <b>Текущий статус:</b>
• Фаза: MVP (бета-тестирование)
• Аудитория: растёт
• Buyback: скоро

Следите за обновлениями в Live Report.""",
    
    "en": """ℹ️ <b>About VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO is not just a news bot.
It's a media asset backed by real economics.

🔹 <b>How it works:</b>

1️⃣ <b>Content</b>
VERO AI analyzes thousands of sources and selects only important news. Each piece goes through an AI editor that explains meaning and consequences.

2️⃣ <b>Monetization</b>
Bot ads → revenue → VERO token buyback → distribution to holders.

3️⃣ <b>Transparency</b>
All revenue, buyback, and distribution data published in Live Report.

4️⃣ <b>Exclusive</b>
Holders of 1,000,000 VERO get access to VERO Exclusive — deep analysis and insights.

🎯 <b>Goal:</b>
Build a media asset that grows with audience and brings real value to token holders.

📊 <b>Current status:</b>
• Phase: MVP (beta testing)
• Audience: growing
• Buyback: coming soon

Follow updates in Live Report.""",
    
    "es": """ℹ️ <b>Sobre VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO no es solo un bot de noticias.
Es un activo mediático respaldado por economía real.

🔹 <b>Cómo funciona:</b>

1️⃣ <b>Contenido</b>
VERO AI analiza miles de fuentes y selecciona solo noticias importantes. Cada noticia pasa por un editor AI que explica significado y consecuencias.

2️⃣ <b>Monetización</b>
Anuncios en bot → ingresos → recompra de tokens VERO → distribución a holders.

3️⃣ <b>Transparencia</b>
Todos los datos de ingresos, recompra y distribución publicados en Live Report.

4️⃣ <b>Exclusivo</b>
Holders de 1,000,000 VERO obtienen acceso a VERO Exclusive — análisis profundo e insights.

🎯 <b>Objetivo:</b>
Construir un activo mediático que crece con la audiencia y aporta valor real a los holders.

📊 <b>Estado actual:</b>
• Fase: MVP (prueba beta)
• Audiencia: creciendo
• Buyback: próximamente

Sigue actualizaciones en Live Report.""",
    
    "de": """ℹ️ <b>Über VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO ist nicht nur ein News-Bot.
Es ist ein Medien-Asset, das durch echte Wirtschaft gedeckt ist.

🔹 <b>Wie es funktioniert:</b>

1️⃣ <b>Inhalt</b>
VERO AI analysiert Tausende von Quellen und wählt nur wichtige Nachrichten aus. Jede Nachricht durchläuft einen KI-Redakteur, der Bedeutung und Konsequenzen erklärt.

2️⃣ <b>Monetarisierung</b>
Bot-Werbung → Einnahmen → VERO Token Rückkauf → Verteilung an Holder.

3️⃣ <b>Transparenz</b>
Alle Einnahmen-, Rückkauf- und Verteilungsdaten im Live Report veröffentlicht.

4️⃣ <b>Exklusiv</b>
Holder von 1,000,000 VERO erhalten Zugang zu VERO Exclusive — tiefe Analysen und Insights.

🎯 <b>Ziel:</b>
Ein Medien-Asset aufbauen, das mit dem Publikum wächst und echten Wert für Token-Holder bringt.

📊 <b>Aktueller Status:</b>
• Phase: MVP (Beta-Test)
• Publikum: wächst
• Buyback: bald

Folgen Sie Updates im Live Report."""
}

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
    
    # Приветствие
    await message.answer(
        WELCOME_MESSAGES[lang], 
        parse_mode="HTML", 
        reply_markup=get_main_menu()
    )

    # Подбор 3 новостей
    count = 0
    for feed_url in RSS_FEEDS:
        if count >= 3: break
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]:
                if count >= 3: break
                
                analysis = await analyze_and_style_news(entry.title, entry.summary[:300], entry.link)
                
                if analysis and analysis.get('score', 0) >= 7:
                    post_text = analysis.get(lang, analysis.get('en', ''))
                    final_post = f"{post_text}\n\n🔗 <a href='{entry.link}'>Source</a>"
                    
                    await message.answer(final_post, parse_mode="HTML", disable_web_page_preview=False)
                    
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

@dp.message(F.text == "🧠 VERO News Analysis")
async def show_feed(message: types.Message):
    user_lang = db.get_user_language(message.from_user.id) or "en"
    texts = {
        "ru": "🧠 <b>VERO News Analysis</b>\n\nВы подписаны на новостную аналитику. Новые разборы приходят автоматически по мере появления важных событий.",
        "en": "🧠 <b>VERO News Analysis</b>\n\nYou're subscribed to news intelligence. New analysis arrives automatically as important events happen.",
        "es": "🧠 <b>VERO News Analysis</b>\n\nEstás suscrito a inteligencia de noticias. Nuevos análisis llegan automáticamente cuando ocurren eventos importantes.",
        "de": "🧠 <b>VERO News Analysis</b>\n\nSie sind für News Intelligence abonniert. Neue Analysen kommen automatisch, wenn wichtige Ereignisse passieren."
    }
    await message.answer(texts.get(user_lang, texts["en"]), parse_mode="HTML")

@dp.message(F.text == "ℹ️ About VERO")
async def show_about(message: types.Message):
    user_lang = db.get_user_language(message.from_user.id) or "en"
    await message.answer(ABOUT_MESSAGES.get(user_lang, ABOUT_MESSAGES["en"]), parse_mode="HTML")

@dp.message(F.text == "⚙️ Settings")
async def show_settings(message: types.Message):
    user_lang = db.get_user_language(message.from_user.id) or "en"
    texts = {
        "ru": "⚙️ <b>Настройки</b>\n\nВыберите язык:",
        "en": "⚙️ <b>Settings</b>\n\nChoose language:",
        "es": "⚙️ <b>Configuración</b>\n\nElige idioma:",
        "de": "⚙️ <b>Einstellungen</b>\n\nSprache wählen:"
    }
    await message.answer(texts.get(user_lang, texts["en"]), reply_markup=get_lang_keyboard(), parse_mode="HTML")

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
