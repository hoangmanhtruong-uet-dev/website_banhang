import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Money, normalizeCurrency, parseMoneyInput, serializeMoneyFields } from '@/lib/utils/money';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const existing = await prisma.voucher.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Voucher không tồn tại' }, { status: 404 });
    if (existing.sellerId !== session.userId) return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa voucher này' }, { status: 403 });
    const raw = await req.json() as Record<string, unknown>;
    const discountType = raw.discountType === undefined ? existing.discountType : (raw.discountType === 'percentage' || raw.discountType === 'fixed' ? raw.discountType : null);
    if (!discountType) return NextResponse.json({ error: 'discountType không hợp lệ' }, { status: 400 });
    const discountValue = raw.discountValue === undefined ? existing.discountValue : parseMoneyInput(raw.discountValue, { allowZero: false, field: 'discountValue' });
    if (discountType === 'percentage' && Money.compare(discountValue, '100') > 0) return NextResponse.json({ error: 'Percentage discount must not exceed 100' }, { status: 400 });
    const voucher = await prisma.voucher.update({ where: { id: params.id }, data: {
      description: typeof raw.description === 'string' ? raw.description : existing.description,
      discountType, discountValue,
      minOrderValue: raw.minOrderValue === undefined ? existing.minOrderValue : parseMoneyInput(raw.minOrderValue, { field: 'minOrderValue' }),
      maxDiscount: raw.maxDiscount === undefined ? existing.maxDiscount : (raw.maxDiscount === null || raw.maxDiscount === '' ? null : parseMoneyInput(raw.maxDiscount, { field: 'maxDiscount' })),
      currency: raw.currency === undefined ? existing.currency : normalizeCurrency(raw.currency),
      endDate: typeof raw.endDate === 'string' ? new Date(raw.endDate) : existing.endDate,
      usageLimit: typeof raw.usageLimit === 'number' && Number.isInteger(raw.usageLimit) ? raw.usageLimit : existing.usageLimit,
    } });
    return NextResponse.json({ message: 'Cập nhật voucher thành công', voucher: serializeMoneyFields(voucher) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getSession();
  if (!session || (!session.isSeller && session.role !== 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const existing = await prisma.voucher.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: 'Voucher không tồn tại' }, { status: 404 });
  if (existing.sellerId !== session.userId) return NextResponse.json({ error: 'Bạn không có quyền xóa voucher này' }, { status: 403 });
  await prisma.voucher.delete({ where: { id: params.id } });
  return NextResponse.json({ message: 'Đã xóa voucher thành công' });
}
