from aiogram.utils.keyboard import InlineKeyboardBuilder

def main_menu():
    builder = InlineKeyboardBuilder()
    builder.button(text="📊 Live Report", callback_data="report")
    builder.button(text="💎 VERO Exclusive", callback_data="exclusive")
    builder.button(text="📢 Free Feed", callback_data="feed")
    builder.button(text="👤 My Profile", callback_data="profile")
    builder.adjust(2)
    return builder.as_markup()
