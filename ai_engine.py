import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang, source):
    prompt = f"""You are VERO AI, a world-class crypto analyst. Analyze this news for a {lang} audience.
News: {title} - {description}
Source: {source}

STRICT RULES:
1. TRANSLATE everything to {lang}.
2. EXPLAIN all complex terms (like PMI, Long/Short, Reflation, etc.) in simple words for beginners.
3. Use bold HTML tags <b></b> for headers.
4. Add empty lines between blocks.

STRUCTURE:
💎 <b>[TITLE IN CAPS]</b>

[2-3 sentences: What happened. Explain any complex terms mentioned here.]

🧠 <b>VERO AI SUMMARY</b>

<b>Что это значит:</b>
[Simple explanation of the impact. Why should a regular person care?]

<b>Для кого важно:</b>
• <b>Инвесторы:</b> [Specific impact/action]
• <b>Трейдеры:</b> [Specific impact/action]
• <b>Новички:</b> [Specific impact/action]

<b>Сценарии:</b>

✅ <b>[Positive Scenario]</b> — вероятность [X]%
[Detailed description]

⚠️ <b>[Negative Scenario]</b> — вероятность [Y]%
[Detailed description]

📰 <b>Источник:</b> {source}"""

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o", "messages": [{"role": "user", "content": prompt}], "temperature": 0.3}

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            return None
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
        return None
    except: return None
