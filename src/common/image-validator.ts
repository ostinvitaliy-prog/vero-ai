import { Logger } from '@nestjs/common';
import axios from 'axios';

const logger = new Logger('ImageValidator');

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200',
  'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=1200',
  'https://images.unsplash.com/photo-1640826514546-7d2d285a2e59?w=1200',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200',
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1200',
];

export async function validateImageUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
  } catch {
    logger.warn(\`Invalid URL format: \${url}\`);
    return false;
  }

  if (!url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) && !url.includes('unsplash') && !url.includes('imgur')) {
    logger.warn(\`URL doesn't appear to be an image: \${url}\`);
    return false;
  }

  try {
    const response = await axios.head(url, {
      timeout: timeoutMs,
      maxRedirects: 3,
      validateStatus: (status) => status < 400,
    });

    const contentType = response.headers['content-type'];
    if (contentType && contentType.startsWith('image/')) {
      return true;
    }

    logger.warn(\`URL is not an image (content-type: \${contentType}): \${url}\`);
    return false;
  } catch (error) {
    logger.warn(\`Image validation failed for \${url}: \${error.message}\`);
    return false;
  }
}

export function getRandomFallbackImage(): string {
  const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[randomIndex];
}

export async function resolveNewsImage(originalImage?: string): Promise<string> {
  if (originalImage) {
    const isValid = await validateImageUrl(originalImage);
    if (isValid) {
      logger.log(\`✓ Using original image: \${originalImage.substring(0, 60)}...\`);
      return originalImage;
    }
  }

  const fallback = getRandomFallbackImage();
  logger.log(\`Using fallback image: \${fallback}\`);
  return fallback;
}
