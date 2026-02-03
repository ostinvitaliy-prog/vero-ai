# ... (начало файла такое же)

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🇷🇺 Русский"), KeyboardButton(text="🇺🇸 English")],
            [KeyboardButton(text="🇪🇸 Español"), KeyboardButton(text="🇩🇪 Deutsch")]
        ], 
        resize_keyboard=True
    )
    await message.answer("<b>VERO | Media-Backed Asset</b>\n\nChoose language / Выберите язык:", reply_markup=kb, parse_mode="HTML")

@dp.message(F.text.in_(["🇷🇺 Русский", "🇺🇸 English", "🇪🇸 Español", "🇩🇪 Deutsch"]))
async def set_lang(message: types.Message):
    lang_map = {"🇷🇺 Русский": "ru", "🇺🇸 English": "en", "🇪🇸 Español": "es", "🇩🇪 Deutsch": "de"}
    lang = lang_map.get(message.text, "en")
    db.save_user(message.from_user.id, lang)
    
    welcome = {
        "ru": "👋 Добро пожаловать в VERO!",
        "en": "👋 Welcome to VERO!",
        "es": "👋 ¡Bienvenido a VERO!",
        "de": "👋 Willkommen bei VERO!"
    }
    wait_msg = {
        "ru": "⏳ Анализирую последние новости...",
        "en": "⏳ Analyzing latest news...",
        "es": "⏳ Analizando las últimas noticias...",
        "de": "⏳ Analysiere aktuelle Nachrichten..."
    }
    
    await message.answer(welcome[lang], reply_markup=get_main_menu())
    msg = await message.answer(wait_msg[lang])
    
    # Выдача 3 новостей
    sent = 0
    for feed_url in RSS_FEEDS:
        if sent >= 3: break
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:5]:
            if sent >= 3: break
            analysis = await analyze_and_style_news(entry.title, entry.summary[:400], lang)
            img = await extract_image_from_source(entry.link)
            text = analysis if analysis else f"📢 <b>{entry.title}</b>\n\n{entry.link}"
            try:
                if img:
                    await message.answer_photo(img, caption=text[:1024], parse_mode="HTML")
                else:
                    await message.answer(text, parse_mode="HTML")
                sent += 1
            except: continue
            await asyncio.sleep(1)
    await msg.delete()

# ... (остальные хендлеры такие же)
