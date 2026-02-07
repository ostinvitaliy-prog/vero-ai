import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { CronService } from './cron/cron.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Создаем приложение БЕЗ использования SwaggerModule вообще
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 10000;
  await app.listen(port);
  
  logger.log(`✅ Application is running on: http://localhost:${port}`);

  // ПРИНУДИТЕЛЬНЫЙ ЗАПУСК СКАНЕРА
  try {
    const cronService = app.get(CronService);
    logger.log('🚀 STARTING INITIAL NEWS SCAN...');
    // Запускаем процесс
    cronService.scanNews();
  } catch (e) {
    logger.error('❌ Failed to start initial scan', e);
  }
}
bootstrap();
