import asyncio
import os
from aiogram import Bot, Dispatcher
from aiohttp import web
import database as db
import handlers
import autoposter

async def handle(request): return web.Response(text="VERO Alive")

async def main():
    db.init_db()
    bot = Bot(token='8050168002:AAEnS0NsuVn4-_WZbOLTpluPDP8BCqF3CUQ')
    dp = Dispatcher()
    
    handlers.register_handlers(dp)
    asyncio.create_task(autoposter.start_autoposter(bot))
    
    app = web.Application()
    app.router.add_get('/', handle)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', int(os.getenv("PORT", 10000)))
    await site.start()
    
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
