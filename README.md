# VERO AI - Crypto News Telegram Bot

AI-powered Telegram bot that aggregates crypto news from 9+ sources, analyzes them, and posts the most important news to channels.

## Features
- 📰 Aggregates news from Cointelegraph, CoinDesk, Decrypt, BeInCrypto, etc.
- 🤖 AI analysis with priority system (🔴 RED, 🟡 YELLOW, 🟢 GREEN)
- 🌍 Multi-language support (EN, RU)
- 📢 Auto-posting to Telegram channels
- ⏰ Scans every 15 min, posts top-1 news every hour

## Telegram Channels
- EN: @vero_crypto_news
- RU: @vero_crypto_news_ru

## Tech Stack
- NestJS + TypeScript
- PostgreSQL + Prisma ORM
- Telegraf (Telegram Bot API)
- OpenAI-compatible LLM API

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/vero-bot.git
cd vero-bot
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Run
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Deploy to Render.com

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml`
5. Add environment variables:
   - `TELEGRAM_BOT_TOKEN` - from @BotFather
   - `ABACUSAI_API_KEY` - your LLM API key
6. Deploy!

## API Endpoints

- `GET /` - Health check
- `POST /admin/scan-now` - Manual news scan
- `POST /admin/broadcast-now` - Manual broadcast
- `POST /webhook/telegram` - Telegram webhook
- `GET /api-docs` - Swagger documentation

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `DATABASE_URL` | PostgreSQL connection string |
| `ABACUSAI_API_KEY` | LLM API key (OpenAI-compatible) |
| `APP_ORIGIN` | Your app URL for webhooks |

## After Deploy: Set Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.onrender.com/webhook/telegram"
```

## License
MIT