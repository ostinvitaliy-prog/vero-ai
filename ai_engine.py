import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    """
    Анализирует новость и возвращает структурированный JSON
    для поста в стиле топовых крипто-каналов
    """
    prompt = f"""You are VERO AI — an elite crypto media editor for institutional traders and smart investors.

NEWS:
Title: {title}
Description: {description}
Source: {source_url}

TASK:
Create a premium Telegram post. Short, confident, factual. No hype, no "revolutionary".

OUTPUT (strict JSON):
{{
  "title": "SHORT HOOK (max 6 words, ALL CAPS if needed)",
  "summary": "2-3 sentences: what happened, numbers, who involved",
  "meaning": "What this means in simple terms (1 sentence)",
  "audience": "Who should care (traders/holders/devs/institutions)",
  "bull": "Bullish scenario (1 short line)",
  "bear": "Bearish scenario (1 short line)",
  "verdict": "VERO verdict: short take (1 line)",
  "emoji": "Pick ONE: 📈 📉 💎 ⚠️ 🔥 🧠 🐋 ⚡️",
  "score": 1-10,
  "ru": "Full formatted post in Russian",
  "en": "Full formatted post in English",
  "es": "Full formatted post in Spanish",
  "de": "Full formatted post in German"
}}

FORMATTING FOR EACH LANGUAGE:
{{emoji}} {{title}}

{{summary}}

🧠 VERO AI SUMMARY

• Что это значит:
{{meaning}}

• Для кого важно:
{{audience}}

• Сценарии:
✅ {{bull}}
⚠️ {{bear}}

📊 VERO VERDICT:
{{verdict}}

Use proper translations and adapt style to each language."""

    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are VERO AI. Return only valid JSON. Premium crypto analysis."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
        "max_tokens": 2000
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
                timeout=60.0
            )
            result = resp.json()
            content = result['choices'][0]['message']['content']
            analysis = json.loads(content)
            logging.info(f"✅ AI analyzed: {analysis.get('title', 'N/A')}")
            return analysis
        except Exception as e:
            logging.error(f"❌ AI Engine error: {e}")
            return None

async def extract_image_from_source(url):
    """Извлекает og:image из статьи для красивого превью"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0, follow_redirects=True)
            if 'og:image' in resp.text:
                start = resp.text.find('og:image" content="') + len('og:image" content="')
                end = resp.text.find('"', start)
                img_url = resp.text[start:end]
                logging.info(f"🖼 Image found: {img_url[:50]}...")
                return img_url
            return None
    except Exception as e:
        logging.error(f"Image extraction failed: {e}")
        return None
