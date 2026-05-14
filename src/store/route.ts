import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    // Trong thực tế, cần check admin role ở đây bằng middleware hoặc session
    const { id } = params;
    const body = await req.json();
    const validatedData = updateOrderStatusSchema.parse(body);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: validatedData.status,
      },
      include: { orderItems: { include: { product: true } } },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}