import axios from 'axios';
import { Logger } from '@nestjs/common';

const logger = new Logger('ImageValidator');

export async function validateImageUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  try {
    if (!url) return false;
    const response = await axios.head(url, { timeout: timeoutMs });
    const contentType = response.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      logger.warn(`URL is not an image: ${url}`);
      return false;
    }
    return true;
  } catch (error: any) {
    logger.warn(`Failed to validate image URL: ${url} - ${error?.message || error}`);
    return false;
  }
}
