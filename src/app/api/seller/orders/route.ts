import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!canAccessSeller(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const fulfillments = await prisma.sellerFulfillment.findMany({
      where: { sellerId: session.userId },
      include: {
        order: { select: {
          id: true, customerName: true, customerPhone: true, shippingAddress: true,
          paymentMethod: true, paymentStatus: true, createdAt: true,
        } },
        orderItems: { include: { product: { select: { id: true, name: true, image: true, emoji: true } } } },
        shipper: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(serializeMoneyFields(fulfillments));
  } catch (error) {
    console.error('[SELLER_ORDERS_GET]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
