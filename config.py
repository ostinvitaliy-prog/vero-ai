@dp.message(Command("test"))
    async def cmd_test(message: types.Message):
        await message.answer("🔄 Генерирую тестовую новость на всех языках...")
        import ai_engine as ai
        # Тестовые данные
        res = await ai.analyze_and_style_news("Bitcoin hits new all-time high", "BTC price surged past 100k today amid massive institutional buying.")
        if res:
            lang = db.get_user_lang(message.from_user.id)
            db.save_news(res['ru'], res['en'], res['es'], res['de'], "https://test.com", res['score'])
            await message.answer(f"✅ Готово! Твоя версия ({lang}):\n\n{res[lang]}", parse_mode="HTML")
        else:
            await message.answer("❌ Ошибка ИИ.")
