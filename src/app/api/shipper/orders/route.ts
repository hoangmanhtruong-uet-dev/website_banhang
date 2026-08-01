import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'shipper') {
      return NextResponse.json({ error: 'Shipper access required' }, { status: 403 });
    }

    const fulfillments = await prisma.sellerFulfillment.findMany({
      where: { OR: [
        { status: 'packing', shipperId: null },
        { shipperId: session.userId, status: { in: ['packing', 'shipping', 'delivered'] } },
      ] },
      include: {
        order: { select: {
          id: true, customerName: true, customerPhone: true, shippingAddress: true,
          paymentMethod: true, paymentStatus: true, createdAt: true,
        } },
        seller: { select: { id: true, name: true, phone: true } },
        shipper: { select: { id: true, name: true, phone: true } },
        orderItems: { include: { product: { select: { id: true, name: true, image: true, emoji: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const scoped = fulfillments.map((fulfillment) => {
      const assignedToMe = fulfillment.shipperId === session.userId;
      return {
        ...fulfillment,
        assignment: assignedToMe ? 'mine' : 'available',
        order: {
          ...fulfillment.order,
          customerName: assignedToMe ? fulfillment.order.customerName : 'Khách hàng',
          customerPhone: assignedToMe ? fulfillment.order.customerPhone : 'Ẩn đến khi nhận kiện',
          shippingAddress: assignedToMe ? fulfillment.order.shippingAddress : 'Nhận kiện để xem địa chỉ giao hàng',
        },
      };
    });
    return NextResponse.json(serializeMoneyFields(scoped));
  } catch (error) {
    console.error('[GET /api/shipper/orders]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
