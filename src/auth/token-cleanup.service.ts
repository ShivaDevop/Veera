import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * Service for cleaning up expired and revoked refresh tokens
 * Can be called manually or scheduled via cron job
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Clean up expired and old revoked tokens
   * Should be called periodically (e.g., daily via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    this.logger.log('Starting token cleanup...');
    try {
      const deletedCount = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              isRevoked: true,
              revokedAt: {
                lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      });

      this.logger.log(`Cleaned up ${deletedCount.count} expired/revoked tokens`);
      return deletedCount.count;
    } catch (error) {
      this.logger.error('Error during token cleanup', error);
      throw error;
    }
  }
}

