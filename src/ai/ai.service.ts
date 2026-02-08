async generatePost(newsText: string, lang: 'RU' | 'EN') {
    if (!this.apiKey) return 'Ошибка: GROQ_API_KEY не найден';

    const prompt = lang === 'RU' 
      ? `Ты — ведущий аналитик Vero AI. Сделай сочный и структурированный пост.
         ПРАВИЛА:
         1. ПЕРВАЯ СТРОКА: Эмодзи (🟡, 🟢 или 🔴 по смыслу) + заголовок жирным <b>ВЕРХНИМ РЕГИСТРОМ</b> + эмодзи ракеты или огня.
         2. СРАЗУ ПОСЛЕ: Информативный текст новости без лишних вступлений. Выделяй важные цифры, суммы и названия жирным <b>.
         3. РАЗДЕЛИТЕЛЬ: ---
         4. БЛОК "💡 VERO AI SUMMARY": Твое авторское пояснение простым языком о влиянии на рынок.
         5. БЛОК "⚠️ МОЖЕТ ПРИВЕСТИ К": Список из 3 пунктов с эмодзи.
         6. РАЗДЕЛИТЕЛЬ: ---
         7. ИНТЕРАКТИВ: Вопрос к аудитории и призыв писать в комментарии (💬 ... 👇).
         8. ССЫЛКА: 🔗 Источник: <a href="...">Название</a>.
         
         ВАЖНО: Используй много эмодзи. Используй ТОЛЬКО HTML (<b>, <a>). Никакого Markdown.`
      : `Analyze as Vero AI. No "What is it about?" phrases. First line: Emoji + BOLD CAPS title. Add VERO AI SUMMARY, points, and "What do you think?" call to action. HTML only.`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You output clean HTML with many emojis. No markdown stars." },
          { role: "user", content: `${prompt}\n\nТекст новости:\n${newsText}` }
        ],
        temperature: 0.65
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
      });

      return response.data.choices[0].message.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    } catch (error) {
      return `Ошибка Groq: ${error.message}`;
    }
  }
