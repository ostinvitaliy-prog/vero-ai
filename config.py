import os

# Telegram Bot
BOT_TOKEN = os.getenv("BOT_TOKEN")

# RouteLLM API
ROUTEL_API_KEY = os.getenv("ROUTEL_API_KEY")
BASE_URL = "https://routellm.abacus.ai/v1"

# News Settings
NEWS_CHECK_INTERVAL = 600  # 10 минут (проверка источников)
MIN_NEWS_SCORE = 7  # Постим только важное (7+ из 10)

# Database
DB_PATH = "vero.db"
