import { type NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ConflictError, NotFoundError } from '@/lib/errors';

const schema = z.object({ action: z.enum(['APPROVE', 'REJECT']), rejectionReason: z.string().trim().min(5).max(500).optional() }).strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    return prisma.$transaction(async tx => {
      const payout = await tx.payoutRequest.findUnique({ where: { id } });
      if (!payout) throw new NotFoundError('Không tìm thấy payout');
      if (payout.status !== 'PENDING') throw new ConflictError('Payout đã được xử lý');
      if (input.action === 'APPROVE') {
        await tx.sellerSettlement.updateMany({ where: { payoutRequestId: id, status: 'PROCESSING' }, data: { status: 'PAID', paidAt: new Date() } });
        return tx.payoutRequest.update({ where: { id }, data: { status: 'PAID', processedAt: new Date(), processedBy: admin.userId } });
      }
      await tx.sellerSettlement.updateMany({ where: { payoutRequestId: id, status: 'PROCESSING' }, data: { status: 'AVAILABLE', payoutRequestId: null } });
      return tx.payoutRequest.update({ where: { id }, data: { status: 'REJECTED', processedAt: new Date(), processedBy: admin.userId, rejectionReason: input.rejectionReason ?? 'Rejected by admin' } });
    });
  })(req);
}