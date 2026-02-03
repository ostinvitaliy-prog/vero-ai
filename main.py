import asyncio
import logging
import feedparser
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
import database as db
from config import BOT_TOKEN
from autoposter import start_autoposter, RSS_FEEDS
from ai_engine import analyze_and_style_news
from aiohttp import web

logging.basicConfig(level=logging.INFO)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

LANG_CHOICES = ["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]

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

def get_settings_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🌍 Change Language")],
            [KeyboardButton(text="🙈 Hide Keyboard"), KeyboardButton(text="📌 Show Menu")],
            [KeyboardButton(text="⬅️ Back")]
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

Это <b>новостная аналитика</b>, а не обзор рынка.
Без сигналов. Без пампа. Только смысл.
""",
    "en": """👋 <b>Welcome to VERO</b>

VERO is an AI-powered crypto & Web3 media.
We don't just show news — we explain what it means and who should care.

🧠 <b>What you get:</b>
• Curated key news
• Clean breakdown without noise
• 2 development scenarios
• VERO AI verdict

This is <b>news intelligence</b>, not a market overview.
No signals. No hype. Just meaning.
""",
    "es": """👋 <b>Bienvenido a VERO</b>

VERO es un medio de cripto y Web3 impulsado por IA.
No solo mostramos noticias — explicamos qué significan y para quién son importantes.

🧠 <b>Lo que obtienes:</b>
• Selección de noticias clave
• Análisis claro sin ruido
• 2 escenarios de desarrollo
• Veredicto de VERO AI

Esto es <b>inteligencia de noticias</b>, no resumen de mercado.
Sin señales. Sin hype. Solo significado.
""",
    "de": """👋 <b>Willkommen bei VERO</b>

VERO ist ein KI-gestütztes Krypto- & Web3-Medium.
Wir zeigen nicht nur Nachrichten — wir erklären, was sie bedeuten und für wen sie wichtig sind.

🧠 <b>Was Sie bekommen:</b>
• Kuratierte Schlüsselnachrichten
• Klare Analyse ohne Rauschen
• 2 Entwicklungsszenarien
• VERO AI Urteil

Dies ist <b>News Intelligence</b>, keine Marktübersicht.
Keine Signale. Kein Hype. Nur Bedeutung.
"""
}

ABOUT_MESSAGES = {
    "ru": """ℹ️ <b>О проекте VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO — это медиа-актив, обеспеченный реальной экономикой.

🔹 <b>Как это работает:</b>
1) VERO AI отбирает и разбирает важные новости.
2) Реклама → доход → buyback токенов VERO → распределение холдерам.
3) Прозрачность: отчёты в Live Report.
4) Exclusive: доступ для держателей (порог зададим позже).

🎯 <b>Цель:</b> создать медиа, которое растёт с аудиторией и создаёт ценность держателям.
""",
    "en": """ℹ️ <b>About VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO is a media asset backed by real economics.

How it works:
1) VERO AI curates and explains key news.
2) Ads → revenue → VERO buybacks → distributions to holders.
3) Transparency in Live Report.
4) Exclusive for holders (threshold configurable later).

Goal: build media that grows with the audience and creates value for holders.
""",
    "es": """ℹ️ <b>Sobre VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO es un activo mediático respaldado por economía real.

Cómo funciona:
1) VERO AI selecciona y explica noticias clave.
2) Anuncios → ingresos → recompra de VERO → distribución a holders.
3) Transparencia en Live Report.
4) Exclusive para holders (umbral configurable después).

Objetivo: construir un medio que crezca con la audiencia y cree valor para holders.
""",
    "de": """ℹ️ <b>Über VERO</b>

<b>VERO | Media-Backed Asset</b>

VERO ist ein Medien-Asset, das durch echte Wirtschaft gedeckt ist.

Wie es funktioniert:
1) VERO AI kuratiert und erklärt wichtige News.
2) Werbung → Einnahmen → VERO Rückkäufe → Ausschüttung an Holder.
3) Transparenz im Live Report.
4) Exclusive für Holder (Schwelle später konfigurierbar).

Ziel: ein Medium aufbauen, das mit dem Publikum wächst und Wert für Holder schafft.
"""
}

def onboarding_header(lang: str) -> str:
    if lang == "ru":
        return "🗞 <b>Вот последние 3 новости.</b>\nОстальные будут добавляться по мере поступления.\n"
    if lang == "es":
        return "🗞 <b>Aquí están las últimas 3 noticias.</b>\nEl resto se añadirá a medida que lleguen.\n"
    if lang == "de":
        return "🗞 <b>Hier sind die letzten 3 News.</b>\nWeitere kommen automatisch, sobald sie erscheinen.\n"
    return "🗞 <b>Here are the latest 3 news.</b>\nMore will be added as they come in.\n"

def fallback_post(entry, lang: str) -> str:
    # Без AI: просто “топовый” минимальный формат (заголовок + ссылка)
    # Можно потом улучшить (эмодзи/1-2 строки), но главное — чтобы не было тишины.
    if lang == "ru":
        return f"📰 <b>{entry.title}</b>\n\n🔗 <a href='{entry.link}'>Читать оригинал</a>"
    if lang == "es":
        return f"📰 <b>{entry.title}</b>\n\n🔗 <a href='{entry.link}'>Leer fuente</a>"
    if lang == "de":
        return f"📰 <b>{entry.title}</b>\n\n🔗 <a href='{entry.link}'>Quelle lesen</a>"
    return f"📰 <b>{entry.title}</b>\n\n🔗 <a href='{entry.link}'>Read source</a>"

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "<b>VERO | Media-Backed Asset</b>\n\nChoose your language / Выберите язык:",
        reply_markup=get_lang_keyboard(),
        parse_mode="HTML"
    )

@dp.message(F.text.in_(LANG_CHOICES))
async def set_language(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)

    await message.answer(WELCOME_MESSAGES.get(lang, WELCOME_MESSAGES["en"]), parse_mode="HTML", reply_markup=get_main_menu())
    await message.answer(onboarding_header(lang), parse_mode="HTML", disable_web_page_preview=True)

    # Гарантированно выдаём 3 новости:
    # - Сначала пробуем AI-формат (если RouteLLM работает)
    # - Если AI не работает/403 — отправляем fallback, но всё равно 3 штуки
    sent = 0

    for feed_url in RSS_FEEDS:
        if sent >= 3:
            break

        feed = feedparser.parse(feed_url)
        entries = getattr(feed, "entries", []) or []
        if not entries:
            continue

        for entry in entries[:10]:
            if sent >= 3:
                break

            # Пропускаем дубли (если уже в базе)
            if hasattr(entry, "link") and entry.link and db.is_news_posted(entry.link):
                continue

            try:
                analysis = await analyze_and_style_news(entry.title, getattr(entry, "summary", "")[:400], entry.link)

                # Если AI вернул нормальный пост на нужном языке — отправляем его
                if analysis and analysis.get(lang):
                    post_text = analysis.get(lang)
                    final_post = f"{post_text}\n\n🔗 <a href='{entry.link}'>Source</a>"
                    await message.answer(final_post, parse_mode="HTML", disable_web_page_preview=False)

                    # Сохраняем, чтобы не повторять
                    try:
                        db.save_news(
                            analysis.get("ru", ""),
                            analysis.get("en", ""),
                            analysis.get("es", ""),
                            analysis.get("de", ""),
                            entry.link,
                            int(analysis.get("score", 7)) if str(analysis.get("score", "")).isdigit() else 7
                        )
                    except Exception as e:
                        logging.error(f"DB save_news failed: {e}")

                else:
                    # AI не сработал — отправляем fallback, но всё равно красиво и быстро
                    await message.answer(fallback_post(entry, lang), parse_mode="HTML", disable_web_page_preview=False)

                # Помечаем как “отправлено”, чтобы реально было 3
                sent += 1
                await asyncio.sleep(1)

            except Exception as e:
                logging.error(f"Onboarding news error: {e}")
                # Даже если тут исключение — пытаемся fallback как последний шанс
                try:
                    await message.answer(fallback_post(entry, lang), parse_mode="HTML", disable_web_page_preview=False)
                    sent += 1
                    await asyncio.sleep(1)
                except Exception:
                    pass

    if sent < 3:
        # Если источники пустые/битые — честно говорим
        if lang == "ru":
            await message.answer("⚠️ Сейчас источники обновляются. Новые новости придут автоматически, как только появятся.")
        else:
            await message.answer("⚠️ Sources are updating. New news will arrive automatically as soon as they appear.")

@dp.message(F.text == "⚙️ Settings")
async def show_settings(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    if lang == "ru":
        txt = "⚙️ <b>Настройки</b>\n\nЧто хотите изменить?"
    elif lang == "es":
        txt = "⚙️ <b>Configuración</b>\n\n¿Qué quieres cambiar?"
    elif lang == "de":
        txt = "⚙️ <b>Einstellungen</b>\n\nWas möchten Sie ändern?"
    else:
        txt = "⚙️ <b>Settings</b>\n\nWhat would you like to change?"
    await message.answer(txt, parse_mode="HTML", reply_markup=get_settings_menu())

@dp.message(F.text == "🌍 Change Language")
async def change_language(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    txt = {
        "ru": "🌍 <b>Смена языка</b>\nВыберите язык:",
        "en": "🌍 <b>Change language</b>\nChoose language:",
        "es": "🌍 <b>Cambiar idioma</b>\nElige idioma:",
        "de": "🌍 <b>Sprache ändern</b>\nSprache wählen:"
    }.get(lang, "🌍 <b>Change language</b>\nChoose language:")
    await message.answer(txt, parse_mode="HTML", reply_markup=get_lang_keyboard())

@dp.message(F.text == "🙈 Hide Keyboard")
async def hide_keyboard(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    txt = {
        "ru": "🙈 Кнопки скрыты. Чтобы вернуть меню — нажмите <b>📌 Show Menu</b> (или отправьте /start).",
        "en": "🙈 Keyboard hidden. To bring back the menu press <b>📌 Show Menu</b> (or send /start).",
        "es": "🙈 Teclado oculto. Para volver al menú pulsa <b>📌 Show Menu</b> (o envía /start).",
        "de": "🙈 Tastatur ausgeblendet. Um das Menü zurückzubringen, drücken Sie <b>📌 Show Menu</b> (oder /start)."
    }.get(lang, "🙈 Keyboard hidden. To bring back the menu press <b>📌 Show Menu</b> (or /start).")
    await message.answer(txt, parse_mode="HTML", reply_markup=ReplyKeyboardRemove())

@dp.message(F.text == "📌 Show Menu")
async def show_menu(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    txt = {
        "ru": "📌 Меню возвращено.",
        "en": "📌 Menu restored.",
        "es": "📌 Menú restaurado.",
        "de": "📌 Menü wiederhergestellt."
    }.get(lang, "📌 Menu restored.")
    await message.answer(txt, reply_markup=get_main_menu())

@dp.message(F.text == "⬅️ Back")
async def back_to_menu(message: types.Message):
    await message.answer("⬅️", reply_markup=get_main_menu())

@dp.message(F.text == "ℹ️ About VERO")
async def show_about(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    await message.answer(ABOUT_MESSAGES.get(lang, ABOUT_MESSAGES["en"]), parse_mode="HTML", disable_web_page_preview=True)

@dp.message(F.text == "🧠 VERO News Analysis")
async def show_feed(message: types.Message):
    lang = db.get_user_language(message.from_user.id) or "en"
    txt = {
        "ru": "🧠 <b>VERO News Analysis</b>\n\nЭто основной поток новостной аналитики. Новые разборы приходят автоматически по мере появления важных событий.",
        "en": "🧠 <b>VERO News Analysis</b>\n\nThis is the main news analysis stream. New breakdowns arrive automatically as important events happen.",
        "es": "🧠 <b>VERO News Analysis</b>\n\nEste es el flujo principal de análisis. Nuevos resúmenes llegan automáticamente cuando ocurren eventos importantes.",
        "de": "🧠 <b>VERO News Analysis</b>\n\nDies ist der Hauptstream. Neue Analysen kommen automatisch, sobald wichtige Ereignisse passieren."
    }.get(lang, "🧠 <b>VERO News Analysis</b>\n\nNew breakdowns arrive automatically.")
    await message.answer(txt, parse_mode="HTML")

@dp.message(F.text == "📊 Live Report")
async def show_report(message: types.Message):
    await message.answer(
        "📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00\nTotal Burned: 0 VERO",
        parse_mode="HTML"
    )

@dp.message(F.text == "👤 My Profile")
async def show_profile(message: types.Message):
    await message.answer(f"👤 <b>Profile</b>\nID: {message.from_user.id}", parse_mode="HTML")

@dp.message(F.text == "💎 VERO Exclusive")
async def show_exclusive(message: types.Message):
    await message.answer(
        "🔒 <b>Access Denied.</b>\n\nRequires 1,000,000 VERO tokens to unlock Exclusive Feed.",
        parse_mode="HTML"
    )

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
