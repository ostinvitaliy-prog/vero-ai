import sqlite3
from config import DB_NAME

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, lang TEXT DEFAULT "ru")')
    cursor.execute('CREATE TABLE IF NOT EXISTS news_history (id INTEGER PRIMARY KEY AUTOINCREMENT, content_ru TEXT, content_en TEXT, content_es TEXT, content_de TEXT, link TEXT, score INTEGER)')
    conn.commit()
    conn.close()

def add_user(user_id, lang="ru"):
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

def save_news(content_ru, content_en, content_es, content_de, link, score):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO news_history (content_ru, content_en, content_es, content_de, link, score) VALUES (?, ?, ?, ?, ?, ?)', 
                   (content_ru, content_en, content_es, content_de, link, score))
    cursor.execute('DELETE FROM news_history WHERE id NOT IN (SELECT id FROM news_history ORDER BY id DESC LIMIT 10)')
    conn.commit()
    conn.close()

def get_recent_news(lang="ru", limit=3):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    col = f"content_{lang}"
    cursor.execute(f'SELECT {col}, link FROM news_history ORDER BY id DESC LIMIT ?', (limit,))
    return cursor.fetchall()

def get_user_lang(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT lang FROM users WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    return result[0] if result else "ru"
