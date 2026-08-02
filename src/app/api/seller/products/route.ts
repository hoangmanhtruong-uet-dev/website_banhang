import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';
import { serializeMoneyFields } from '@/lib/utils/money';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !canAccessSeller(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const products = await prisma.product.findMany({ where: { sellerId: session.userId, deletedAt: null }, include: { categoryRef: true, images: true }, orderBy: { createdAt: 'desc' } });
    const soldStats = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        product: { sellerId: session.userId },
        fulfillment: { sellerId: session.userId, status: 'delivered' },
        order: { status: { notIn: ['cancelled', 'returned', 'refunded'] } },
      },
    });
    const soldMap = new Map(soldStats.map((stat) => [stat.productId, stat._sum.quantity ?? 0]));
    return NextResponse.json(serializeMoneyFields(products.map((product) => ({ ...product, soldQuantity: soldMap.get(product.id) ?? 0 }))));
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
