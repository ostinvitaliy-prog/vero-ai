import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description):
    prompt = (
        f"NEWS: {title} - {description}\n\n"
        f"TASK: Create 4 versions of this crypto news (RU, EN, ES, DE).\n"
        f"STYLE: Bold, professional, insider tone. Use crypto slang and tickers (BTC, ETH).\n"
        f"FORMAT:\n"
        f"⚡️ [HEADLINE]\n"
        f"• [Essence]\n"
        f"• [Why it matters]\n"
        f"💎 VERO VERDICT: [Your take]\n\n"
        f"MAX LENGTH: 400 chars per language.\n"
        f"OUTPUT JSON ONLY:\n"
        f"{{\"score\": 1-10, \"ru\": \"text\", \"en\": \"text\", \"es\": \"text\", \"de\": \"text\", \"image_prompt\": \"futuristic cyber neon crypto illustration about [TOPIC]\"}}"
    )
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini", 
        "messages": [
            {"role": "system", "content": "You are a multilingual crypto journalist. Create an image_prompt in English for DALL-E."},
            {"role": "user", "content": prompt}
        ], 
        "response_format": {"type": "json_object"},
        "temperature": 0.4
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers, timeout=40.0)
            return json.loads(resp.json()['choices'][0]['message']['content'])
        except Exception as e:
            logging.error(f"AI Error: {e}")
            return None

async def Image Generation(prompt):
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "dall-e-3",
        "prompt": f"{prompt}, dark tech aesthetic, neon cyan and violet lighting, high quality, 16:9",
        "n": 1,
        "size": "1024x1024"
    }
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BASE_URL}/images/generations", json=payload, headers=headers, timeout=60.0)
            return resp.json()['data'][0]['url']
        except Exception as e:
            logging.error(f"Image Gen Error: {e}")
            return None
