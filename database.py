import sqlite3
from config import DB_NAME

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)')
    cursor.execute('CREATE TABLE IF NOT EXISTS news_history (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, link TEXT, score INTEGER)')
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM users')
    return [row[0] for row in cursor.fetchall()]

def save_news(content, link, score):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO news_history (content, link, score) VALUES (?, ?, ?)', (content, link, score))
    cursor.execute('DELETE FROM news_history WHERE id NOT IN (SELECT id FROM news_history ORDER BY id DESC LIMIT 10)')
    conn.commit()
    conn.close()

def get_recent_news(limit=3):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT content, link FROM news_history ORDER BY id DESC LIMIT ?', (limit,))
    return cursor.fetchall()
