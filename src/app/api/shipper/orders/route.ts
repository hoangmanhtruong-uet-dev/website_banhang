import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession, canAccessShipper } from '@/lib/auth';

// GET: Lấy toàn bộ đơn hàng (shipper quản lý mọi đơn)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !canAccessShipper(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: { product: { select: { name: true, price: true, image: true, emoji: true } } },
        },
        shipper: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(serializeMoneyFields(orders));
  } catch (error) {
    console.error('[GET /api/shipper/orders]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
