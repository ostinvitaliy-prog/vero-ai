import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, lang):
    # Словарь для адаптации заголовков под язык
    headers_map = {
        "ru": {"summary": "🧠 VERO AI SUMMARY", "insight": "📊 VERO INSIGHT", "mean": "Что это значит", "who": "Для кого важно", "scen": "Сценарии"},
        "en": {"summary": "🧠 VERO AI SUMMARY", "insight": "📊 VERO INSIGHT", "mean": "What it means", "who": "Who it matters for", "scen": "Scenarios"},
        "es": {"summary": "🧠 VERO AI RESUMEN", "insight": "📊 VERO INSIGHT", "mean": "Qué означает", "who": "Para quién importa", "scen": "Escenarios"},
        "de": {"summary": "🧠 VERO AI ZUSAMMENFASSUNG", "insight": "📊 VERO INSIGHT", "mean": "Was es bedeutet", "who": "Für wen es важно", "scen": "Szenarien"}
    }
    h = headers_map.get(lang, headers_map["en"])

    prompt = f"""You are VERO AI — an elite crypto media editor. 
Analyze this news for a {lang} audience.

News: {title} - {description}

Format your response EXACTLY like this (no extra words, no bold labels like 'Title:'):
<b>{title}</b>

{description[:200]}...

{h['summary']}
• <b>{h['mean']}:</b> [1 sentence]
• <b>{h['who']}:</b> [List]
• <b>{h['scen']}:</b> 
✅ <b>Bull:</b> [Scenario]
⚠️ <b>Bear:</b> [Scenario]

{h['insight']}
[Your final elite conclusion]"""

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o", 
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4
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
