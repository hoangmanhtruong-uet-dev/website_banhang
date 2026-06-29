import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessShipper } from '@/lib/auth';

// PATCH: Cập nhật trạng thái, ngày nhận, tracking, và gán shipper
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !canAccessShipper(session)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { status, estimatedDelivery, trackingNumber, shippingProvider, assignSelf } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status.toLowerCase();
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery);
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (shippingProvider !== undefined) updateData.shippingProvider = shippingProvider;
    if (assignSelf) updateData.shipperId = session.userId;

    // Nếu DELIVERED thì set deliveredAt
    if (status && status.toUpperCase() === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        shipper: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/shipper/orders/:id]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
