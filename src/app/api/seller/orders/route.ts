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

    // Tìm các OrderItem chứa sản phẩm của Seller này
    const orders = await prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            product: {
              sellerId: session.userId
            }
          }
        }
      },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: {
          where: {
            product: { sellerId: session.userId }
          },
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(serializeMoneyFields(orders));
  } catch (error) {
    console.error('[SELLER_ORDERS_GET]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
