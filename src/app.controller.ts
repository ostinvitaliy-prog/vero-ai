import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('test/post')
  async testPost() {
    // Вызываем метод, который мы прописали в AppService в прошлом шаге
    return await this.appService.testPost();
  }
}
