import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { CronService } from './cron/cron.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT || 10000;
  await app.listen(port);
  
  logger.log(`✅ Application is running on: http://localhost:${port}`);

  try {
    const cronService = app.get(CronService);
    logger.log('🚀 STARTING INITIAL NEWS SCAN & POST ONE...');
    await cronService.scanAndPostOne();
  } catch (e) {
    logger.error('❌ Failed to start initial scan', e);
  }
}
bootstrap();
