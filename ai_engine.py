import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
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
"""

    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Return only valid JSON. No extra text."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
        "max_tokens": 1400
    }

    url = f"{BASE_URL}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            logging.error(f"❌ RouteLLM HTTP {resp.status_code}: {resp.text[:500]}")
            return None

        data = resp.json()

        # Защита от кривого ответа
        if "choices" not in data or not data["choices"]:
            logging.error(f"❌ RouteLLM bad response, no choices: {str(data)[:500]}")
            return None

        content = data["choices"][0]["message"]["content"]
        analysis = json.loads(content)

        # Мини-проверка структуры
        if not isinstance(analysis, dict):
            logging.error("❌ AI JSON is not a dict")
            return None

        return analysis

    except Exception as e:
        logging.error(f"❌ AI Engine exception: {e}")
        return None
