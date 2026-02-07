import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { CronService } from './cron/cron.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Включаем CORS для безопасности
  app.enableCors();

  const port = process.env.PORT || 10000;
  await app.listen(port);
  
  logger.log(`✅ Application is running on: http://localhost:${port}`);

  // ЗАПУСК ТЕСТОВОГО СКАНИРОВАНИЯ ПРИ СТАРТЕ
  const cronService = app.get(CronService);
  logger.log('🚀 Triggering initial news scan...');
  
  // Запускаем без await, чтобы не блокировать старт приложения
  cronService.scanNews().catch(err => {
    logger.error('❌ Initial scan failed:');
    logger.error(err);
  });
}
bootstrap();
