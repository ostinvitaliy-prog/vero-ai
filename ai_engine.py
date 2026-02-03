import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang):
    # Промпт с жесткой структурой и примером
    prompt = f"""You are VERO AI. Analyze this crypto news for a {lang} audience.
News: {title} - {description}

STRICT FORMAT RULES:
1. TRANSLATE the title and all content to {lang}.
2. Use simple language for non-crypto people.
3. Add empty lines between blocks for readability.

STRUCTURE:
💎 <b>[TITLE IN CAPS AND {lang}]</b>

[2-3 sentences: Who, what, where, when, how much. Use {lang}.]

🧠 <b>VERO AI SUMMARY</b>

<b>Что это значит:</b>
[Simple explanation of impact in 1-2 sentences]

<b>Для кого важно:</b>
• <b>[Group 1]:</b> [Specific action or risk for them]
• <b>[Group 2]:</b> [Specific action or risk for them]
• <b>[Group 3]:</b> [Specific action or risk for them]

<b>Сценарии:</b>

✅ <b>[Positive Scenario Name]</b> — вероятность [X]%
[Description of what happens]

⚠️ <b>[Negative Scenario Name]</b> — вероятность [Y]%
[Description of what happens]

Return ONLY the formatted text in {lang}. No extra labels."""

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
    except:
        return None
