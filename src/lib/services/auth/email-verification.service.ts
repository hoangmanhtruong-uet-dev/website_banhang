import prisma from '@/lib/db';
import crypto from 'node:crypto';

export class EmailVerificationService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createToken(userId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 60 minutes valid

    // Invalidate old tokens for this user
    await prisma.verificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.verificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  static async verifyAndUseToken(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const verificationToken = await tx.verificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt <= now) {
        return null;
      }

      const used = await tx.verificationToken.updateMany({
        where: {
          id: verificationToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (used.count !== 1) {
        return null;
      }

      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { isEmailVerified: true },
      });

      return verificationToken.user;
    });
  }
}
