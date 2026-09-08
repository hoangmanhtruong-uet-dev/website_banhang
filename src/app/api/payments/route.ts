import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { requireIdempotencyKey } from '@/lib/idempotency/idempotency';
import { PaymentService } from '@/lib/services/payment/payment.service';
import { paymentRequestSchema } from '@/lib/validations';
import { verifyPaymentPinOrThrow } from '@/lib/security/payment-pin-policy';

export const POST = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const key = requireIdempotencyKey(req.headers);
  const body = paymentRequestSchema.parse(await req.json());
  await verifyPaymentPinOrThrow(session.userId, body.paymentPin);
  const { paymentPin: _paymentPin, ...safeBody } = body;
  const operation = `payment:create:${safeBody.orderId}`;
  const outcome = await IdempotencyService.execute({
    scopeId: session.userId, operation, method: req.method, signal: req.signal, key, request: safeBody,
    retentionHours: Number(process.env.PAYMENT_IDEMPOTENCY_RETENTION_HOURS || 168),
    handler: async (tx) => {
      const payment = await PaymentService.create(tx, { ...safeBody, userId: session.userId, idempotencyKey: key });
      return { status: 201, body: payment, resourceType: 'payment', resourceId: payment.id };
    },
  });
  return NextResponse.json(outcome.body, { status: outcome.status, headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined });
});