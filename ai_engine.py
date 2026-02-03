import httpx
import json
import logging
from config import ROUTEL_API_KEY, BASE_URL

async def analyze_and_style_news(title, description, source_url):
    """
    Анализирует новость на английском (основа), генерирует 2 сценария,
    переводит на RU, ES, DE для новичков (без сложных терминов).
    """
    prompt = (
        f"NEWS: {title} - {description}\n"
        f"SOURCE: {source_url}\n\n"
        f"TASK: Create a multi-language crypto news post for beginners (not experts).\n\n"
        f"RULES:\n"
        f"1. LANGUAGE: Simple words. No jargon. Instead of 'volatility' say 'price swings', instead of 'liquidity' say 'available money'.\n"
        f"2. EXTRACT FACTS: WHO did WHAT, HOW MUCH, WHEN (if available in the news). No facts = low score.\n"
        f"3. FORMAT (for each language: en, ru, es, de):\n\n"
        f"⚡️ [SHORT HEADLINE WITH SPECIFICS]\n\n"
        f"• [Fact 1 with numbers/names/dates]\n"
        f"• [Fact 2 - why it matters for regular holders]\n"
        f"• [Fact 3 - what is confirmed vs. what is not]\n\n"
        f"VERO AI:\n"
        f"📈 Scenario 1 (X%): [Simple explanation of positive outcome]\n"
        f"📉 Scenario 2 (Y%): [Simple explanation of negative outcome]\n\n"
        f"Focus: [1-2 things to watch next - levels/events/confirmations]\n"
        f"Risks: [1-2 common mistakes to avoid - emotions/panic/FOMO]\n\n"
        f"4. PROBABILITIES: Must sum to 100%. Be realistic based on news strength.\n"
        f"5. NO PROMISES. No 'will grow'. Give two scenarios.\n"
        f"6. SCORE: 1-10 (how important is this news for regular crypto holders?)\n"
        f"   - 9-10: Major market-moving event\n"
        f"   - 7-8: Important, affects sentiment\n"
        f"   - 5-6: Noteworthy, but limited impact\n"
        f"   - 1-4: Noise, skip it\n\n"
        f"7. OUTPUT JSON:\n"
        f'{{"score": 1-10, "en": "text", "ru": "текст", "es": "texto", "de": "text"}}'
    )
    
    headers = {"Authorization": f"Bearer {ROUTEL_API_KEY}"}
    payload = {
        "model": "gpt-4o-mini", 
        "messages": [
            {
                "role": "system", 
                "content": (
                    "You are VERO AI - a crypto analyst for regular people (not experts). "
                    "Your job: extract facts (who/what/when/how much), give 2 scenarios with probabilities, "
                    "and avoid jargon. Write in simple language. NO investment advice. "
                    "Base analysis on English, then translate to RU, ES, DE keeping simplicity."
                )
            },
            {"role": "user", "content": prompt}
        ], 
        "response_format": {"type": "json_object"},
        "temperature": 0.4
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/chat/completions", 
                json=payload, 
                headers=headers, 
                timeout=50.0
            )
            result = json.loads(resp.json()['choices'][0]['message']['content'])
            logging.info(f"AI Analysis Score: {result.get('score', 0)}/10")
            return result
        except Exception as e:
            logging.error(f"AI Analysis Error: {e}")
            return None


async def extract_image_from_source(url):
    """
    Пытается достать картинку из источника (og:image или RSS media).
    Если не получилось - возвращает None (потом можно подставить фирменную).
    """
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=15.0, follow_redirects=True)
            html = resp.text
            
            # Ищем og:image (самый надёжный способ)
            if 'og:image' in html:
                start = html.find('og:image" content="') + len('og:image" content="')
                end = html.find('"', start)
                img_url = html[start:end]
                
                if img_url.startswith('http'):
                    logging.info(f"Image found: {img_url[:60]}...")
                    return img_url
            
            return None
    except Exception as e:
        logging.error(f"Image extraction error: {e}")
        return None
