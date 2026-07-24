import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { InventoryService } from '@/lib/services/inventory.service';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { status, trackingNumber } = await req.json();
    const validStatus = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatus.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    if (status === 'cancelled') {
      await InventoryService.cancel(params.id);
      const order = await prisma.order.findUniqueOrThrow({ where: { id: params.id } });
      return NextResponse.json({ message: 'Cập nhật trạng thái thành công', order });
    }

    const safeTrackingNumber = typeof trackingNumber === 'string' ? trackingNumber : undefined;
    const order = await InventoryService.transitionOrderStatus(params.id, status, safeTrackingNumber);

    return NextResponse.json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
