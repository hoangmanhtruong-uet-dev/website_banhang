import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { serializeMoneyFields } from '@/lib/utils/money';

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
      include: {
        orderItems: { include: { product: true } },
        shipper: { select: { name: true, phone: true, licensePlate: true } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    return NextResponse.json(serializeMoneyFields(order));
  } catch (error) {
    console.error('[GET /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
