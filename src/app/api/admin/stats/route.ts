import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/admin/stats - Dashboard stats (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [
      totalProducts,
      totalOrders,
      totalUsers,
      ordersByStatus,
      recentOrders,
      revenue,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { orderItems: { include: { product: true } } },
      }),
      prisma.order.aggregate({ _sum: { total: true } }),
    ]);

    const statusMap = Object.fromEntries(
      ordersByStatus.map(s => [s.status, s._count.status])
    );

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue: revenue._sum.total ?? 0,
      ordersByStatus: statusMap,
      recentOrders,
    });
  } catch (error) {
    console.error('[GET /api/admin/stats]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
