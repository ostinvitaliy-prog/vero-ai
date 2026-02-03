import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang):
    prompt = f"""You are VERO AI — an elite crypto media editor.
Analyze this news for a {lang} audience:
Title: {title}
Description: {description}

Structure:
💎 TITLE (Bold)
Summary (2 lines)
🧠 VERO AI SUMMARY
• Что это значит:
• Для кого важно:
• Сценарии: ✅ Bull / ⚠️ Bear
📊 VERO VERDICT:

Return ONLY the text in {lang} language."""

    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "gpt-4o", 
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    }

    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            else:
                logging.error(f"AI Error {resp.status_code}: {resp.text}")
                return None
    except Exception as e:
        logging.error(f"AI Exception: {e}")
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
    except:
        return None
