import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    prompt = f"""You are VERO AI — an elite crypto media editor.

TASK:
Create a premium Telegram post based on this news:
Title: {title}
Description: {description}

STRUCTURE:
💎 TITLE (Short, bold)

Brief explanation of what happened (2-3 lines).

🧠 VERO AI SUMMARY
• Что это значит: (Simple explanation)
• Для кого важно: (Target audience)
• Сценарии:
✅ Bull: (Short bullish take)
⚠️ Bear: (Short bearish take)

📊 VERO VERDICT: (Final short take)

OUTPUT JSON:
{{
  "ru": "Formatted post in Russian",
  "en": "Formatted post in English",
  "es": "Formatted post in Spanish",
  "de": "Formatted post in German"
}}
"""

    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "abacus-gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Return ONLY valid JSON. Use the exact structure requested."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
        
        if resp.status_code == 200:
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        else:
            logging.error(f"AI Error: {resp.status_code}")
            return None
    except Exception as e:
        logging.error(f"AI Exception: {e}")
        return None

async def extract_image_from_source(url: str):
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url)
            html = r.text
        marker = 'property="og:image" content="'
        if marker in html:
            start = html.find(marker) + len(marker)
            end = html.find('"', start)
            return html[start:end]
        return None
    except:
        return None
