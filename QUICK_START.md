# Быстрый старт

## 1. Установка

```bash
git clone <repo>
cd vero-bot
npm install
```

## 2. Настройка .env

```bash
cp .env.example .env
```

Заполнить:
- `TELEGRAM_BOT_TOKEN` — от @BotFather
- `DATABASE_URL` — PostgreSQL строка подключения
- `ABACUSAI_API_KEY` — ключ LLM API

## 3. База данных

```bash
npx prisma generate
npx prisma migrate deploy
```

## 4. Запуск

```bash
# Разработка
npm run start:dev

# Продакшн
npm run build
npm run start:prod
```

## 5. Webhook (после деплоя)

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_DOMAIN/webhook/telegram"
```

## 6. Проверка

- `GET /` — должен вернуть "Hello World!"
- `GET /api-docs` — Swagger документация
- `POST /admin/scan-now` — запустить сканирование
- `POST /admin/broadcast-now` — запустить постинг