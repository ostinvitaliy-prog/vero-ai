import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description):
    prompt = (
        f"ROLE: Elite Crypto Insider (Style: INVESTMAX/CRYPTO_HD).\n"
        f"NEWS: {title} - {description}\n\n"
        f"STRICT RULES:\n"
        f"1. LANGUAGE: 100% Russian. No English words except tickers (BTC, ETH, SOL, etc.).\n"
        f"2. SLANG: Use 'биток', 'альта', 'эфир', 'лонг', 'шорт', 'киты'.\n"
        f"3. LENGTH: Max 500 characters. Be concise and sharp.\n"
        f"4. STRUCTURE:\n"
        f"⚡️ [ЖИРНЫЙ ЗАГОЛОВОК]\n"
        f"• [Суть новости в 2 предложениях]\n"
        f"• [Почему это важно для рынка]\n"
        f"💎 VERO VERDICT: [Твой дерзкий прогноз/совет]\n\n"
        f"5. Output JSON ONLY: {{\"score\": int, \"content\": \"string\"}}"
    )
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini", 
        "messages": [{"role": "user", "content": prompt}], 
        "response_format": {"type": "json_object"},
        "temperature": 0.7 # Добавим немного креативности
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return json.loads(resp.json()['choices'][0]['message']['content'])
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return None
