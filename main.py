import asyncio
import os
import logging
from aiogram import Bot, Dispatcher
from aiohttp import web
import database as db
import handlers
import autoposter

async def handle(request):
    return web.Response(text="VERO Alive")

async def main():
    logging.basicConfig(level=logging.INFO)
    db.init_db()
    
    bot = Bot(token='8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ')
    dp = Dispatcher()
    
    # ВАЖНО: Передаем dp в обработчики
    handlers.register_handlers(dp)
    
    asyncio.create_task(autoposter.start_autoposter(bot))
    
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.getenv("PORT", 10000)))
    await site.start()
    
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
