import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    try {
      this.logger.log('⏳ Connecting to database and syncing schema...');
      
      // Принудительная синхронизация схемы перед подключением
      try {
        this.logger.log('Syncing Prisma schema via db push...');
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      } catch (syncError) {
        this.logger.error('Schema sync warning (continuing):', syncError);
      }

      await this.$connect();
      this.logger.log('✅ Database connected and schema synced');
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper methods for common queries
  async getUser(userId: bigint) {
    return this.users.findUnique({
      where: { user_id: userId },
    });
  }

  async createUser(userId: bigint, lang: string) {
    return this.users.create({
      data: {
        user_id: userId,
        lang: lang,
      },
    });
  }

  async updateUserLanguage(userId: bigint, lang: string) {
    return this.users.update({
      where: { user_id: userId },
      data: { lang },
    });
  }
}
