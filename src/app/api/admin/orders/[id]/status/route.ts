import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

    const updateData: { status: string; trackingNumber?: string } = { status };
    if (trackingNumber && typeof trackingNumber === 'string') {
      updateData.trackingNumber = trackingNumber;
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ message: 'Cập nhật trạng thái thành công', order });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
