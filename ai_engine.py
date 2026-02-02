import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description):
    prompt = (
        f"ROLE: Elite Crypto Journalist. STYLE: Professional, bold, premium.\n"
        f"NEWS: {title} - {description}\n\n"
        f"TASK:\n"
        f"1. Evaluate importance (score 1-10).\n"
        f"2. Rewrite in Russian. Use bold headers, bullet points, and clean spacing.\n"
        f"3. Structure: ⚡️ HEADLINE -> • Essence -> • Why it matters -> 💎 VERO VERDICT.\n"
        f"4. Use emojis sparingly but effectively (📈, 📉, ⚡️, 💎).\n\n"
        f"OUTPUT JSON ONLY:\n"
        f"{{\"score\": int, \"content\": \"string\"}}"
    )
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}}
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return json.loads(resp.json()['choices'][0]['message']['content'])
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return None
