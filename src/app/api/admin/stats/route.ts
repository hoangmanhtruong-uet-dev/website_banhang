import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Money } from '@/lib/utils/money';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const [totalUsers, totalProducts, totalOrders, activeSellers, revenueAggregate] = await Promise.all([
      prisma.user.count(), prisma.product.count(), prisma.order.count(),
      prisma.user.count({ where: { isSeller: true } }),
      prisma.order.aggregate({ _sum: { total: true } }),
    ]);
    return NextResponse.json({
      totalUsers, totalProducts, totalOrders, activeSellers,
      revenue: Money.serialize(revenueAggregate._sum.total ?? '0'), currency: 'VND',
    });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
