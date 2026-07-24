import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Money, serializeMoneyFields } from '@/lib/utils/money';
import { voucherMoneySchema } from '@/lib/validations';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const vouchers = await prisma.voucher.findMany({ where: { sellerId: session.userId }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(serializeMoneyFields(vouchers));
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const raw = await req.json() as Record<string, unknown>;
    const parsed = voucherMoneySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const code = typeof raw.code === 'string' ? raw.code.toUpperCase().trim() : '';
    const discountType = raw.discountType === 'percentage' || raw.discountType === 'fixed' ? raw.discountType : null;
    if (!code || !discountType || typeof raw.endDate !== 'string') return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    if (discountType === 'percentage' && Money.compare(parsed.data.discountValue, '100') > 0) return NextResponse.json({ error: 'Percentage discount must not exceed 100' }, { status: 400 });
    if (await prisma.voucher.findUnique({ where: { code } })) return NextResponse.json({ error: 'Mã voucher đã tồn tại' }, { status: 400 });
    const voucher = await prisma.voucher.create({ data: {
      code, description: typeof raw.description === 'string' ? raw.description : null, discountType,
      discountValue: parsed.data.discountValue, minOrderValue: parsed.data.minOrderValue,
      maxDiscount: parsed.data.maxDiscount ?? null, currency: parsed.data.currency,
      endDate: new Date(raw.endDate), usageLimit: typeof raw.usageLimit === 'number' && Number.isInteger(raw.usageLimit) ? raw.usageLimit : 100,
      sellerId: session.userId,
    } });
    return NextResponse.json({ message: 'Tạo voucher thành công', voucher: serializeMoneyFields(voucher) }, { status: 201 });
  } catch (error) {
    console.error('[POST_SELLER_VOUCHER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
