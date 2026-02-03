import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    prompt = f"""You are VERO AI. Create a premium crypto news post.
News: {title} - {description}

Structure:
💎 TITLE
Summary (2 lines)
🧠 VERO AI SUMMARY
• Что это значит:
• Для кого важно:
• Сценарии: ✅ Bull / ⚠️ Bear
📊 VERO VERDICT:

Return JSON with keys: ru, en, es, de."""

    # Пробуем разные варианты заголовков, чтобы пробить 403
    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json",
        "X-API-KEY": ROUTEL_API_KEY # Некоторые системы Abacus требуют этот заголовок
    }
    
    payload = {
        "model": "abacus-gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
        
        if resp.status_code == 200:
            return json.loads(resp.json()["choices"][0]["message"]["content"])
        else:
            logging.error(f"AI Error {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        logging.error(f"AI Exception: {e}")
        return None

async def extract_image_from_source(url: str):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(url)
            if 'og:image' in r.text:
                start = r.text.find('og:image" content="') + 19
                return r.text[start:r.text.find('"', start)]
        return None
    except:
        return None
