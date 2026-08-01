import { NextRequest, NextResponse } from 'next/server';
import { orderRequestSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/db';
import { OrderService } from '@/lib/services/order.service';
import { PasswordService } from '@/lib/services/password.service';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { requireIdempotencyKey } from '@/lib/idempotency';

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
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { paymentPinHash: true },
    });
    if (!user?.paymentPinHash) {
      throw new ValidationError('Bạn chưa thiết lập mã PIN giao dịch. Vui lòng vào trang Ngân hàng để tạo PIN.');
    }
    if (!paymentPin || !await PasswordService.verify(paymentPin, user.paymentPinHash)) {
      throw new AuthenticationError('Mã PIN giao dịch không đúng');
    }
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
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });

  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  });
});