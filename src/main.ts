import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  try {
    const config = new DocumentBuilder()
      .setTitle('VERO AI API')
      .setDescription('The VERO AI Telegram Bot API description')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    if (document.paths && Object.keys(document.paths).length > 0) {
      SwaggerModule.setup('api', app, document);
      logger.log('Swagger documentation is enabled at /api');
    } else {
      logger.warn('Swagger document has no paths, skipping setup');
    }
  } catch (error) {
    logger.error('Error setting up Swagger', error);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
