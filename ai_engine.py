import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    """Анализирует новость и дает экспертный разбор с 2 сценариями"""
    prompt = (
        f"NEWS: {title} - {description}\n"
        f"SOURCE: {source_url}\n\n"
        f"TASK: Expert analysis for beginners.\n"
        f"1. VERDICT: Is this GOOD or BAD for the market? Why?\n"
        f"2. FACTS: Extract 2-3 key facts (who, what, how much).\n"
        f"3. SCENARIOS:\n"
        f"   - Scenario A (Positive): What happens if this goes well?\n"
        f"   - Scenario B (Negative): What happens if this fails?\n"
        f"4. PROBABILITIES: Sum to 100%.\n"
        f"5. LANGUAGE: Simple, no jargon. Translate to EN, RU, ES, DE.\n\n"
        f"OUTPUT JSON FORMAT:\n"
        f'{{"score": 1-10, "en": "text", "ru": "текст", "es": "texto", "de": "text"}}'
    )

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini", 
        "messages": [
            {"role": "system", "content": "You are VERO AI Expert. You provide clear verdicts and 2 scenarios for crypto news. No financial advice."},
            {"role": "user", "content": prompt}
        ], 
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=60.0)
            return json.loads(resp.json()['choices'][0]['message']['content'])
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return None

async def extract_image_from_source(url):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0, follow_redirects=True)
            if 'og:image' in resp.text:
                start = resp.text.find('og:image" content="') + len('og:image" content="')
                end = resp.text.find('"', start)
                return resp.text[start:end]
            return None
    except:
        return None
