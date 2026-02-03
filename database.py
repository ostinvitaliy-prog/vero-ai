import sqlite3
import os

DB_PATH = "vero_bot.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Таблица пользователей
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            language TEXT DEFAULT 'en'
        )
    """)
    # Таблица новостей
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text_ru TEXT,
            text_en TEXT,
            text_es TEXT,
            text_de TEXT,
            link TEXT UNIQUE,
            score INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_user(user_id, language):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO users (user_id, language) VALUES (?, ?)", (user_id, language))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, language FROM users")
    users = cursor.fetchall()
    conn.close()
    return users

def get_user_language(user_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT language FROM users WHERE user_id = ?", (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else "en"

def is_news_posted(link):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM news WHERE link = ?", (link,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

def save_news(ru, en, es, de, link, score):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO news (text_ru, text_en, text_es, text_de, link, score) VALUES (?, ?, ?, ?, ?, ?)",
                       (ru, en, es, de, link, score))
        conn.commit()
    except:
        pass
    conn.close()
