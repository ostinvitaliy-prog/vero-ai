import sqlite3
from config import DB_NAME

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users 
                      (user_id INTEGER PRIMARY KEY, lang TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS news 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       text_ru TEXT, text_en TEXT, text_es TEXT, text_de TEXT, 
                       link TEXT, score INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def save_user(user_id, lang):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO users (user_id, lang) VALUES (?, ?)', (user_id, lang))
    conn.commit()
    conn.close()

def get_users_by_lang(lang):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM users WHERE lang = ?', (lang,))
    users = [row[0] for row in cursor.fetchall()]
    conn.close()
    return users

def save_news(ru, en, es, de, link, score):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO news (text_ru, text_en, text_es, text_de, link, score) VALUES (?, ?, ?, ?, ?, ?)', 
                   (ru, en, es, de, link, score))
    conn.commit()
    conn.close()

def get_latest_news(lang, limit=3):
    """Получает последние N новостей на нужном языке"""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    column = f"text_{lang}"
    cursor.execute(f'SELECT {column}, link FROM news ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows
