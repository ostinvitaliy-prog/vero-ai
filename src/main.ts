import { AIService } from './services/ai.service';
import { TelegramService } from './services/telegram.service';
import { formatPostText } from './utils/formatter'; // Если файла нет, убери эту строку

const ai = new AIService();
const tg = new TelegramService();

async function handleNews(newsItem: any) {
  // Генерация для RU
  const ruContent = await ai.generatePost(newsItem.text, 'RU');
  await tg.sendToChannel(process.env.CHANNEL_ID_RU!, ruContent || '', newsItem.image);

  // Генерация для EN
  const enContent = await ai.generatePost(newsItem.text, 'EN');
  await tg.sendToChannel(process.env.CHANNEL_ID_EN!, enContent || '', newsItem.image);
}
