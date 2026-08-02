import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { NotFoundError } from '@/lib/errors';
import { sellerApprovalSchema } from '@/lib/validations';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = sellerApprovalSchema.parse(await request.json());
    const profile = await prisma.sellerProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundError('Không tìm thấy hồ sơ Seller');
    const approved = input.action === 'APPROVE';
    return prisma.$transaction(async tx => {
      const updated = await tx.sellerProfile.update({ where: { id }, data: {
        status: approved ? 'APPROVED' : 'REJECTED', decidedAt: new Date(), decidedBy: admin.userId,
        rejectionReason: approved ? null : input.rejectionReason,
        ...(input.commissionRate ? { commissionRate: input.commissionRate } : {}),
      } });
      await tx.user.update({ where: { id: profile.userId }, data: { isSeller: approved } });
      await tx.session.updateMany({ where: { userId: profile.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return updated;
    });
  })(req);
}