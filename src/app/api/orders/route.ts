import { NextRequest, NextResponse } from 'next/server';
import { orderRequestSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';
import { OrderService } from '@/lib/services/order.service';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';
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

  const outcome = await IdempotencyService.execute({
    scopeId: session.userId,
    operation: 'order:create',
    method: req.method,
    signal: req.signal,
    key: idempotencyKey,
    request: parsed,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, { ...parsed, userId: session.userId, idempotencyKey });
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });

  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  });
});