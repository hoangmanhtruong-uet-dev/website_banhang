import prisma from '@/lib/db';
import crypto from 'node:crypto';
import { env } from '@/config/env';
import { refreshTokenExpiresAt } from '@/config/refresh-token';

export class SessionService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createSession(userId: string, userAgent?: string, ipAddress?: string) {
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = refreshTokenExpiresAt(new Date(), env.REFRESH_TOKEN_TTL);

    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return { refreshToken, expiresAt };
  }

  static async refreshSession(oldRefreshToken: string, userAgent?: string, ipAddress?: string) {
    const oldHash = this.hashToken(oldRefreshToken);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { tokenHash: oldHash },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < now || !session.user.isActive) {
        if (session) {
          await tx.session.updateMany({
            where: { userId: session.userId, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return null;
      }

      const revoked = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        await tx.session.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return null;
      }

      const refreshToken = crypto.randomBytes(40).toString('hex');
      const tokenHash = this.hashToken(refreshToken);
      const expiresAt = refreshTokenExpiresAt(now, env.REFRESH_TOKEN_TTL);

      await tx.session.create({
        data: {
          userId: session.userId,
          tokenHash,
          expiresAt,
          userAgent,
          ipAddress,
        },
      });

      return { refreshToken, expiresAt, user: session.user };
    });
  }

  static async revokeSession(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllUserSessions(userId: string) {
    await prisma.session.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    });
  }

  static async cleanupExpiredSessions(now = new Date()) {
    return prisma.session.deleteMany({
      where: { expiresAt: { lte: now } },
    });
  }
}