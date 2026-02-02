from aiogram import types, F
from aiogram.filters import Command
import database as db
import keyboards as kb

def register_handlers(dp):
    @dp.message(Command("start"))
    async def cmd_start(message: types.Message):
        db.add_user(message.from_user.id)
        welcome = "🦾 <b>VERO | Media-Backed Asset</b>\n\nМы делаем новости — ты получаешь профит."
        await message.answer(welcome, parse_mode="HTML", reply_markup=kb.main_menu())
        
        recent = db.get_recent_news(3)
        for content, link in reversed(recent):
            await message.answer(f"{content}\n\n🔗 <a href='{link}'>Источник</a>", parse_mode="HTML", disable_web_page_preview=True)

    @dp.message(F.text == "📢 Free Feed")
    async def show_feed(message: types.Message):
        recent = db.get_recent_news(3)
        for content, link in recent:
            await message.answer(f"{content}\n\n🔗 <a href='{link}'>Источник</a>", parse_mode="HTML", disable_web_page_preview=True)

    @dp.message(F.text == "📊 Live Report")
    async def show_report(message: types.Message):
        await message.answer("📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00\nBuyback Fund: $0.00", parse_mode="HTML")

    @dp.message(F.text == "💎 VERO Exclusive")
    async def show_exclusive(message: types.Message):
        await message.answer("🔒 <b>Доступ закрыт.</b>\n\nНужно 1,000,000 VERO.", parse_mode="HTML")

    @dp.message(F.text == "👤 My Profile")
    async def show_profile(message: types.Message):
        await message.answer(f"👤 <b>Профиль</b>\nID: <code>{message.from_user.id}</code>\nБаланс: 0 VERO", parse_mode="HTML")
