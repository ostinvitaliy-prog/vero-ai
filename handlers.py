from aiogram import types, F
from aiogram.filters import Command
import database as db
import keyboards as kb

def register_handlers(dp):
    @dp.message(Command("start"))
    async def cmd_start(message: types.Message):
        db.add_user(message.from_user.id)
        welcome = "🦾 <b>VERO | Media-Backed Asset</b>\n\nМы делаем новости — ты получаешь профит."
        await message.answer(welcome, parse_mode="HTML")
        
        recent = db.get_recent_news(3)
        for content, link in reversed(recent):
            await message.answer(f"{content}\n\n🔗 <a href='{link}'>Источник</a>", parse_mode="HTML", disable_web_page_preview=True)
            
        await message.answer("Выбери раздел:", reply_markup=kb.main_menu())

    @dp.callback_query(F.data == "feed")
    async def show_feed(callback: types.CallbackQuery):
        recent = db.get_recent_news(3)
        for content, link in recent:
            await callback.message.answer(f"{content}\n\n🔗 <a href='{link}'>Источник</a>", parse_mode="HTML", disable_web_page_preview=True)
        await callback.answer()

    @dp.callback_query(F.data == "report")
    async def show_report(callback: types.CallbackQuery):
        await callback.message.answer("📈 <b>VERO Live Transparency</b>\n\nAd Revenue: $0.00", parse_mode="HTML")
        await callback.answer()

    @dp.callback_query(F.data == "exclusive")
    async def show_exclusive(callback: types.CallbackQuery):
        await callback.message.answer("🔒 <b>Доступ закрыт.</b>\n\nНужно 1,000,000 VERO.", parse_mode="HTML")
        await callback.answer()

    @dp.callback_query(F.data == "profile")
    async def show_profile(callback: types.CallbackQuery):
        await callback.message.answer(f"👤 <b>Профиль</b>\nID: <code>{callback.from_user.id}</code>\nБаланс: 0 VERO", parse_mode="HTML")
        await callback.answer()
