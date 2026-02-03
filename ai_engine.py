import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    """
    Анализирует новость через RouteLLM. 
    Если API падает, возвращает None, чтобы main.py отправил fallback-версию.
    """
    prompt = f"""You are VERO AI — an elite crypto media editor.

NEWS:
Title: {title}
Description: {description}
Source: {source_url}

TASK:
Create a premium Telegram post. Short, confident, factual. No hype.

OUTPUT (strict JSON):
{{
  "score": 1-10,
  "ru": "Full formatted post in Russian",
  "en": "Full formatted post in English",
  "es": "Full formatted post in Spanish",
  "de": "Full formatted post in German"
}}

FORMATTING RULES:
- Use emojis meaningfully.
- Include '🧠 VERO AI SUMMARY' block.
- Include '• Что это значит:', '• Для кого важно:', '• Сценарии:'.
- Include '📊 VERO VERDICT:'."""

    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "abacus-gpt-4o-mini", # Исправлено имя модели для RouteLLM
        "messages": [
            {"role": "system", "content": "Return only valid JSON. No extra text."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
        
        if resp.status_code != 200:
            logging.error(f"❌ RouteLLM Error {resp.status_code}: {resp.text}")
            return None

        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception as e:
        logging.error(f"❌ AI Engine Exception: {e}")
        return None
