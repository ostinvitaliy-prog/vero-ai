from aiogram.utils.keyboard import ReplyKeyboardBuilder
from aiogram import types

def main_menu():
    builder = ReplyKeyboardBuilder()
    builder.row(types.KeyboardButton(text="📊 Live Report"), types.KeyboardButton(text="💎 VERO Exclusive"))
    builder.row(types.KeyboardButton(text="📢 Free Feed"), types.KeyboardButton(text="👤 My Profile"))
    return builder.as_markup(resize_keyboard=True)
