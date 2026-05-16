import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/webhook - Giả lập nhận tín hiệu thanh toán từ cổng thanh toán (VNPay, MoMo, v.v.)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Trong thực tế, bạn sẽ verify signature ở đây
    const { orderId, status, secret } = body;

    // Secret giả lập để tránh bị spam bừa bãi
    if (secret !== 'mock-webhook-secret-123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Cập nhật trạng thái đơn hàng
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: status === 'success' ? 'processing' : 'pending' 
      },
    });

    console.log(`[WEBHOOK] Đơn hàng ${orderId} cập nhật trạng thái: ${updatedOrder.status}`);

    return NextResponse.json({ received: true, status: updatedOrder.status });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
