async def analyze_and_style_news(title, description):
    prompt = (
        f"NEWS: {title} - {description}\n\n"
        f"TASK: Create a short, bold crypto post in 4 languages: RU, EN, ES, DE.\n"
        f"STYLE: Professional insider, use tickers (BTC, ETH), crypto slang.\n"
        f"FORMAT: JSON ONLY with keys: ru, en, es, de, score.\n"
        f"Each version must be 100% in its language. No mixing."
    )
    # ... (код запроса к API остается прежним, но в JSON будут 4 языка)
