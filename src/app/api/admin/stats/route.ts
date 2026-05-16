import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Đếm số liệu thực tế từ Database
    const [totalUsers, totalProducts, totalOrders, activeSellers] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      // @ts-ignore
      prisma.user.count({ where: { isSeller: true } })
    ]);

    // Tính tổng doanh thu (giả sử từ tất cả các đơn hàng)
    const orders = await prisma.order.findMany({ select: { total: true } });
    const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return NextResponse.json({
      totalUsers,
      totalProducts,
      totalOrders,
      activeSellers,
      revenue
    });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
