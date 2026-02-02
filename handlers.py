from aiogram import types, F
from aiogram.filters import Command
from aiogram.utils.keyboard import InlineKeyboardBuilder
import database as db
import keyboards as kb
import ai_engine as ai

def register_handlers(dp):
    @dp.message(Command("start"))
    async def cmd_start(message: types.Message):
        builder = InlineKeyboardBuilder()
        builder.button(text="🇷🇺 Русский", callback_data="set_lang_ru")
        builder.button(text="🇺🇸 English", callback_data="set_lang_en")
        builder.button(text="🇪🇸 Español", callback_data="set_lang_es")
        builder.button(text="🇩🇪 Deutsch", callback_data="set_lang_de")
        builder.adjust(2)
        await message.answer("Choose your language / Выберите язык:", reply_markup=builder.as_markup())

    @dp.callback_query(F.data.startswith("set_lang_"))
    async def set_language(callback: types.CallbackQuery):
        lang = callback.data.split("_")[-1]
        db.add_user(callback.from_user.id, lang)
        
        welcome_texts = {
            "ru": "🦾 <b>VERO | Media-Backed Asset</b>\n\nМы делаем новости — ты получаешь профит.",
            "en": "🦾 <b>VERO | Media-Backed Asset</b>\n\nWe create news — you get profit.",
            "es": "🦾 <b>VERO | Media-Backed Asset</b>\n\nCreamos noticias — tú obtienes ganancias.",
            "de": "🦾 <b>VERO | Media-Backed Asset</b>\n\nWir machen News — du bekommst Profit."
        }
        
        await callback.message.answer(welcome_texts[lang], parse_mode="HTML", reply_markup=kb.main_menu())
        
        recent = db.get_recent_news(lang, 3)
        for content, link in reversed(recent):
            await callback.message.answer(f"{content}\n\n🔗 <a href='{link}'>Source</a>", parse_mode="HTML", disable_web_page_preview=True)
        
        await callback.answer()

    @dp.message(F.text == "📢 Free Feed")
    async def show_feed(message: types.Message):
        lang = db.get_user_lang(message.from_user.id)
        recent = db.get_recent_news(lang, 3)
        if not recent:
            await message.answer("📰 No news yet.")
        else:
            for content, link in recent:
                await message.answer(f"{content}\n\n🔗 <a href='{link}'>Source</a>", parse_mode="HTML", disable_web_page_preview=True)

    @dp.message(F.text == "📊 Live Report")
    async def show_report(message: types.Message):
        await message.answer("📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00", parse_mode="HTML")

    @dp.message(F.text == "💎 VERO Exclusive")
    async def show_exclusive(message: types.Message):
        await message.answer("🔒 <b>Access Denied.</b>\n\nRequires 1,000,000 VERO.", parse_mode="HTML")

    @dp.message(F.text == "👤 My Profile")
    async def show_profile(message: types.Message):
        lang = db.get_user_lang(message.from_user.id)
        await message.answer(f"👤 <b>Profile</b>\nID: <code>{message.from_user.id}</code>\nLanguage: {lang.upper()}\nBalance: 0 VERO", parse_mode="HTML")

    @dp.message(Command("test"))
    async def cmd_test(message: types.Message):
        await message.answer("🔄 Генерирую тестовую новость на всех языках...")
        res = await ai.analyze_and_style_news("Bitcoin hits new all-time high", "BTC price surged past 100k today amid massive institutional buying.")
        if res:
            lang = db.get_user_lang(message.from_user.id)
            db.save_news(res['ru'], res['en'], res['es'], res['de'], "https://test.com", res['score'])
            await message.answer(f"✅ Готово! Твоя версия ({lang}):\n\n{res[lang]}", parse_mode="HTML")
        else:
            await message.answer("❌ Ошибка ИИ.")
