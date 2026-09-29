import { NextResponse } from 'next/server';
import payOS from '@/lib/payment/payos';
import prisma from '@/lib/db';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs'; // PayOS SDK uses crypto

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Xác thực chữ ký dữ liệu Webhook từ PayOS (HMAC SHA256)
    const webhookData = payOS.verifyPaymentWebhookData(body);
    
    if (webhookData.code === '00' && webhookData.success) {
      const orderCode = String(webhookData.orderCode);
      
      logger.info('payos.webhook.received', { orderCode, amount: webhookData.amount });

      // Tìm order tương ứng thông qua idempotencyScope
      const order = await prisma.order.findFirst({
        where: { idempotencyScope: orderCode }
      });

      if (order && order.paymentStatus !== 'PAID') {
        await prisma.$transaction(async (tx) => {
          // 1. Cập nhật Order
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'PROCESSING' } // Đã thanh toán, chờ xử lý
          });

          // 2. Đẩy sự kiện Outbox (vd: gửi email)
          await tx.outboxEvent.create({
            data: {
              aggregateType: 'Order',
              aggregateId: order.id,
              eventType: 'ORDER_PAID',
              idempotencyKey: `payos_webhook_${orderCode}`,
              payload: JSON.stringify({ orderId: order.id, amount: webhookData.amount }),
              status: 'PENDING'
            }
          });
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid webhook data' }, { status: 400 });
  } catch (error: any) {
    logger.error('payos.webhook.error', { error: error.message });
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
