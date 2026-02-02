import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description):
    prompt = (
        f"ROLE: Elite Crypto Insider (Style: INVESTMAX/CRYPTO_HD).\n"
        f"NEWS: {title} - {description}\n\n"
        f"STRICT RULES:\n"
        f"1. Use crypto slang: 'биток', 'альта', 'эфир', 'сигналы', 'лонг', 'шорт'.\n"
        f"2. Use tickers: BTC, ETH, SOL instead of full names.\n"
        f"3. Tone: Sharp, aggressive, professional.\n"
        f"4. Structure: ⚡️ HEADLINE -> • Essence -> • Why it matters -> 💎 VERO VERDICT.\n"
        f"5. Output JSON ONLY: {{\"score\": int, \"content\": \"string\"}}"
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
