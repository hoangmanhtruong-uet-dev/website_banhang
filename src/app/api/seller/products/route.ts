import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!canAccessSeller(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await (prisma.product.findMany as any)({
      where: { sellerId: session.userId },
      include: { categoryRef: true, images: true },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate sold quantities for each product
    const soldStats = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { product: { sellerId: session.userId } },
    });

    // Map sold quantity onto products
    const soldMap = Object.fromEntries(
      soldStats.map(s => [s.productId, s._sum.quantity ?? 0])
    );
    const productsWithSold = products.map((p: any) => ({
      ...p,
      soldQuantity: soldMap[p.id] ?? 0,
    }));

    return NextResponse.json(productsWithSold);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
