import sqlite3

def init_db():
    conn = sqlite3.connect("vero.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, lang TEXT)")
    conn.commit()
    conn.close()

def save_user(user_id, lang):
    conn = sqlite3.connect("vero.db")
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO users (user_id, lang) VALUES (?, ?)", (user_id, lang))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect("vero.db")
    c = conn.cursor()
    c.execute("SELECT user_id, lang FROM users")
    users = c.fetchall()
    conn.close()
    return users
