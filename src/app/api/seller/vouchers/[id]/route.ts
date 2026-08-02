import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors';
import { sellerVoucherUpdateSchema } from '@/lib/validations';
import { Money } from '@/lib/utils/money';

async function ownedVoucher(id: string) {
  const session = await getSession();
  if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
  const voucher = await prisma.voucher.findFirst({ where: { id, sellerId: session.userId } });
  if (!voucher) throw new NotFoundError('Voucher không tồn tại');
  return voucher;
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const { id } = await context.params;
    const existing = await ownedVoucher(id);
    const input = sellerVoucherUpdateSchema.parse(await request.json());
    const discountType = input.discountType ?? existing.discountType;
    const discountValue = input.discountValue ?? existing.discountValue;
    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;
    if (discountType === 'percentage' && Money.compare(discountValue, '100') > 0) throw new ValidationError('Phần trăm giảm không được vượt quá 100');
    if (endDate <= startDate) throw new ValidationError('Ngày kết thúc phải sau ngày bắt đầu');
    const voucher = await prisma.voucher.update({ where: { id }, data: input });
    return { message: 'Cập nhật voucher thành công', voucher };
  })(req);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async () => {
    const { id } = await context.params;
    await ownedVoucher(id);
    await prisma.voucher.delete({ where: { id } });
    return { message: 'Đã xóa voucher thành công' };
  })(req);
}