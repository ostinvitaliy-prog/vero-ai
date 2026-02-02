import sqlite3
from config import DB_NAME

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, lang TEXT DEFAULT "en")')
    cursor.execute('CREATE TABLE IF NOT EXISTS news_history (id INTEGER PRIMARY KEY AUTOINCREMENT, content_ru TEXT, content_en TEXT, content_es TEXT, content_de TEXT, link TEXT)')
    conn.commit()
    conn.close()

def add_user(user_id, lang="en"):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id, lang) VALUES (?, ?)', (user_id, lang))
    cursor.execute('UPDATE users SET lang = ? WHERE user_id = ?', (lang, user_id))
    conn.commit()
    conn.close()

def get_users_by_lang(lang):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM users WHERE lang = ?', (lang,))
    return [row[0] for row in cursor.fetchall()]
