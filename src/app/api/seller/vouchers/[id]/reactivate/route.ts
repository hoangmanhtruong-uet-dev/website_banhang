import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const { id } = await context.params;
    const voucher = await prisma.voucher.findFirst({ where: { id, sellerId: session.userId } });
    if (!voucher) throw new NotFoundError('Voucher không tồn tại');
    const body = await request.json().catch(() => ({})) as { endDate?: unknown };
    const endDate = body.endDate === undefined ? new Date(Date.now() + 30 * 86_400_000) : new Date(String(body.endDate));
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) throw new ValidationError('Ngày hết hạn mới phải ở tương lai');
    const updated = await prisma.voucher.update({ where: { id }, data: { endDate } });
    return { message: 'Kích hoạt lại voucher thành công', voucher: updated };
  })(req);
}