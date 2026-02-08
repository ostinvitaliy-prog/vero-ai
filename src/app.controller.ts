import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('test')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('post')
  async testPost(@Query('text') text: string) {
    const testNews = {
      text: text || "Биткоин обновил исторический максимум, преодолев отметку в 100,000 долларов на фоне притока институциональных инвестиций и запуска новых ETF в Гонконге.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6-mJ_vO4Y4qfL-p0P7m8BqS5Fp4m6Yq9XwA&s",
      link: "https://test.com",
      title: "Тестовая новость"
    };

    await this.appService.processNews(testNews);
    return { status: 'Команда отправлена. Проверь каналы RU и EN через 10-20 секунд.' };
  }
}
