import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Money, serializeMoneyFields } from '@/lib/utils/money';
import { voucherMoneySchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const raw = await req.json() as Record<string, unknown>;
    const parsed = voucherMoneySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const code = typeof raw.code === 'string' ? raw.code.toUpperCase().trim() : '';
    const discountType = raw.discountType === 'percentage' || raw.discountType === 'fixed' ? raw.discountType : null;
    if (!code || !discountType || typeof raw.endDate !== 'string') return NextResponse.json({ error: 'Invalid voucher' }, { status: 400 });
    if (discountType === 'percentage' && Money.compare(parsed.data.discountValue, '100') > 0) return NextResponse.json({ error: 'Percentage discount must not exceed 100' }, { status: 400 });
    const voucher = await prisma.voucher.create({ data: {
      code, description: typeof raw.description === 'string' ? raw.description : null, discountType,
      discountValue: parsed.data.discountValue, minOrderValue: parsed.data.minOrderValue, maxDiscount: parsed.data.maxDiscount ?? null,
      currency: parsed.data.currency, sellerId: session.userId, endDate: new Date(raw.endDate),
      usageLimit: typeof raw.usageLimit === 'number' && Number.isInteger(raw.usageLimit) ? raw.usageLimit : 100,
    } });
    return NextResponse.json(serializeMoneyFields(voucher));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Lỗi server' }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  return NextResponse.json(serializeMoneyFields(await prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } })));
}
