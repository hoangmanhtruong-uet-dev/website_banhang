import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/orders/[id] - Chi tiết đơn hàng (admin)
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { product: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[GET /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] - Cập nhật trạng thái đơn hàng (admin only)
export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await req.json();

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { orderItems: { include: { product: true } } },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('[PATCH /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
