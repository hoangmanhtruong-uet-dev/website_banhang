import { Prisma, type PrismaClient } from '@prisma/client';
import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ConflictError, NotFoundError } from '@/lib/errors';
import { payoutRequestSchema } from '@/lib/validations';
import { Money } from '@/lib/utils/money';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export async function GET(req: NextRequest) {
  return createHandler(async () => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const [settlements, payouts] = await Promise.all([
      prisma.sellerSettlement.findMany({ where: { sellerId: session.userId }, orderBy: { availableAt: 'desc' }, take: 100, include: { fulfillment: { select: { orderId: true } } } }),
      prisma.payoutRequest.findMany({ where: { sellerId: session.userId }, orderBy: { requestedAt: 'desc' }, take: 50 }),
    ]);
    return { availableBalance: Money.sum(settlements.filter(item => item.status === 'AVAILABLE').map(item => item.netAmount)), settlements, payouts };
  })(req);
}

export async function POST(req: NextRequest) {
  return createHandler(async request => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const { bankInfoId } = payoutRequestSchema.parse(await request.json());
    return prisma.$transaction(async (tx: Tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM user WHERE id = ${session.userId} FOR UPDATE`);
      const bank = await tx.bankInfo.findFirst({ where: { id: bankInfoId, userId: session.userId } });
      if (!bank) throw new NotFoundError('Tài khoản ngân hàng không tồn tại');
      const settlements = await tx.sellerSettlement.findMany({ where: { sellerId: session.userId, status: 'AVAILABLE' }, orderBy: { availableAt: 'asc' } });
      if (!settlements.length) throw new ConflictError('Không có số dư khả dụng để rút');
      const amount = Money.sum(settlements.map(item => item.netAmount));
      const payout = await tx.payoutRequest.create({ data: { sellerId: session.userId, bankInfoId, amount, currency: 'VND' } });
      const claimed = await tx.sellerSettlement.updateMany({ where: { id: { in: settlements.map(item => item.id) }, status: 'AVAILABLE' }, data: { status: 'PROCESSING', payoutRequestId: payout.id } });
      if (claimed.count !== settlements.length) throw new ConflictError('Số dư vừa thay đổi, vui lòng thử lại');
      return payout;
    });
  })(req);
}