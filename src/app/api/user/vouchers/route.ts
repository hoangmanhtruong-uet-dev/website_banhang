import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { serializeMoneyFields } from '@/lib/utils/money';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const now = new Date();
    const vouchers = await prisma.voucher.findMany({
      where: { startDate: { lte: now }, endDate: { gte: now } },
      include: { seller: { select: { name: true } } },
      orderBy: { endDate: 'asc' },
    });
    return NextResponse.json(serializeMoneyFields(vouchers.filter(voucher => voucher.usedCount < voucher.usageLimit)));
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}