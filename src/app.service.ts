async testPost() {
    const mockNews = {
      title: "Bitcoin Market Update",
      text: "Биткоин закрепился выше уровня $95,000 на фоне высокого спроса со стороны институциональных инвесторов.",
      link: "https://bits.media",
      // Используем прямую ссылку на проверенное изображение
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/800px-Bitcoin.svg.png"
    };

    // 1. Отправляем в RU канал
    const ruContent = await this.aiService.generatePost(mockNews.text); 
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'RU');

    // 2. Отправляем в EN канал
    await this.telegramService.sendNews({ ...mockNews, text: ruContent, priority: 'YELLOW' }, 'EN');
    
    return { status: 'Success', message: 'Тест запущен с корректной картинкой' };
  }
