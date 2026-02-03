import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

# ---------- AI ANALYSIS ----------

async def analyze_and_style_news(title, description, source_url):
    prompt = f"""You are VERO AI — an elite crypto media editor.

NEWS:
Title: {title}
Description: {description}
Source: {source_url}

TASK:
Create a premium Telegram post in this structure:

💎 TITLE

Short summary (2–3 lines)

🧠 VERO AI SUMMARY
• What it means
• Who it matters for
• Scenarios:
✅ Bull
⚠️ Bear

📊 VERO VERDICT

OUTPUT JSON:
{{
  "score": 1-10,
  "ru": "Full formatted post in Russian",
  "en": "Full formatted post in English",
  "es": "Full formatted post in Spanish",
  "de": "Full formatted post in German"
}}

Return ONLY valid JSON.
"""

    headers = {
        "Authorization": f"Bearer {ROUTEL_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "abacus-gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "Return only JSON."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 1500
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )

        if resp.status_code != 200:
            logging.error(f"❌ RouteLLM {resp.status_code}: {resp.text[:300]}")
            return None

        data = resp.json()

        if "choices" not in data:
            logging.error(f"❌ No choices in response: {data}")
            return None

        content = data["choices"][0]["message"]["content"]
        return json.loads(content)

    except Exception as e:
        logging.error(f"❌ AI engine exception: {e}")
        return None


# ---------- IMAGE EXTRACTION (FIX FOR AUTOP0STER) ----------

async def extract_image_from_source(url: str):
    """
    Tries to extract og:image from article HTML.
    If fails — returns None (safe).
    """
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
    except Exception as e:
        logging.error(f"Image extract failed: {e}")
        return None
