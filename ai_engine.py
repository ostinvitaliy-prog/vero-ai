import httpx
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang, source):
    prompt = f"""Analyze this crypto news for {lang} audience.
Title: {title}
Description: {description}
Source: {source}

Format your response exactly like this in {lang}:

💎 <b>[TITLE IN CAPS]</b>

[2-3 sentences explaining what happened and defining any complex terms like PMI, Long/Short, or Reflation in simple words.]

🧠 <b>VERO AI SUMMARY</b>

<b>Что это значит:</b>
[Simple impact explanation in {lang}]

<b>Для кого важно:</b>
• <b>Инвесторы:</b> [Action/Risk in {lang}]
• <b>Трейдеры:</b> [Action/Risk in {lang}]
• <b>Новички:</b> [Action/Risk in {lang}]

<b>Сценарии:</b>

✅ <b>Сценарий роста</b> — вероятность 60%
[Description in {lang}]

⚠️ <b>Сценарий падения</b> — вероятность 40%
[Description in {lang}]

📰 <b>Источник:</b> {source}"""

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o", "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            else:
                logging.error(f"AI API Error: {resp.status_code}")
    except Exception as e:
        logging.error(f"AI Connection Error: {e}")
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
    return "https://cointribune.com/app/uploads/2023/03/crypto-news.jpg"
