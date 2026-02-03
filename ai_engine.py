import httpx
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang, source):
    prompt = f"""You are VERO AI. Analyze this crypto news for a {lang} audience.
News: {title} - {description}
Source: {source}

STRICT FORMAT RULES:
1. TRANSLATE EVERYTHING TO {lang}.
2. EXPLAIN ALL COMPLEX TERMS (like PMI, Reflation, etc.) simply.
3. USE BOLD HTML <b></b> FOR HEADERS.
4. DOUBLE NEW LINES BETWEEN BLOCKS.

STRUCTURE:
💎 <b>[TITLE IN CAPS]</b>

[2-3 sentences: What happened + Explanation of terms. Use {lang}.]

🧠 <b>VERO AI SUMMARY</b>

<b>Что это значит:</b>
[Simple explanation of impact]

<b>Для кого важно:</b>
• <b>Инвесторы:</b> [Specific risk/action]
• <b>Трейдеры:</b> [Specific risk/action]
• <b>Новички:</b> [Specific risk/action]

<b>Сценарии:</b>

✅ <b>Сценарий роста</b> — вероятность [X]%
[Description]

⚠️ <b>Сценарий падения</b> — вероятность [Y]%
[Description]

📰 <b>Источник:</b> {source}"""

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o", "messages": [{"role": "user", "content": prompt}], "temperature": 0.2}

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logging.error(f"AI Error: {e}")
    return None

async def extract_image_from_source(url: str):
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url)
            if 'property="og:image"' in r.text:
                start = r.text.find('property="og:image" content="') + 29
                end = r.text.find('"', start)
                return r.text[start:end]
    except: pass
    return "https://cointribune.com/app/uploads/2023/03/crypto-news.jpg" # Запасное фото
