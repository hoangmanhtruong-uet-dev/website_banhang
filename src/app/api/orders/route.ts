import { NextRequest, NextResponse } from 'next/server';
import { orderRequestSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { OrderService } from '@/lib/services/order/order.service';
import { verifyPaymentPinOrThrow } from '@/lib/security/payment-pin-policy';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { requireIdempotencyKey } from '@/lib/idempotency/idempotency';

export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return OrderService.getOrders(session.userId, session.role);
});

export const POST = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError('Đăng nhập là bắt buộc để tạo đơn hàng');
  const idempotencyKey = requireIdempotencyKey(req.headers);
  const parsed = orderRequestSchema.parse(await req.json());
  const { paymentPin, bankId, paymentPhone, ...orderInput } = parsed;

  if (parsed.paymentMethod !== 'COD') {
    await verifyPaymentPinOrThrow(session.userId, paymentPin);
  }

  if (parsed.paymentMethod === 'Banking') {
    const bank = await prisma.bankInfo.findFirst({ where: { id: bankId, userId: session.userId }, select: { id: true } });
    if (!bank) throw new ValidationError('Tài khoản ngân hàng không hợp lệ');
  }

  const safeRequest = { ...orderInput, bankId, paymentPhone };
  const outcome = await IdempotencyService.execute({
    scopeId: session.userId,
    operation: 'order:create',
    method: req.method,
    signal: req.signal,
    key: idempotencyKey,
    request: safeRequest,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, { ...orderInput, userId: session.userId, idempotencyKey });
      
      let checkoutUrl = null;
      if (orderInput.paymentMethod === 'PayOS') {
        const payOS = (await import('@/lib/payment/payos')).default;
        
        // Tạo orderCode từ ID (số) hoặc random, PayOS yêu cầu number <= 9007199254740991
        const orderCode = Math.floor(Math.random() * 1000000000); 

        const paymentData = {
          orderCode,
          amount: Number(order.total),
          description: `Thanh toan DH ${order.id.slice(0, 5)}`,
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/payment?status=success&orderId=${order.id}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/payment?status=cancel&orderId=${order.id}`,
        };
        
        try {
          const paymentLink = await payOS.createPaymentLink(paymentData);
          checkoutUrl = paymentLink.checkoutUrl;
          
          // Lưu orderCode vào Order.idempotencyScope để Webhook mapping
          await tx.order.update({
            where: { id: order.id },
            data: { idempotencyScope: String(orderCode) }
          });
        } catch (error) {
          console.error("PayOS Error:", error);
          throw new ValidationError('Không thể tạo link thanh toán PayOS');
        }
      }

      return { status: 201, body: { ...order, checkoutUrl }, resourceType: 'order', resourceId: order.id };
    },
  });

  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  });
});