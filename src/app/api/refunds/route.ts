import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { RefundService } from '@/lib/services/payment.service';
import { refundRequestSchema } from '@/lib/validations';

export const POST = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const key = requireIdempotencyKey(req.headers);
  const body = refundRequestSchema.parse(await req.json());
  const operation = `payment:refund:${body.paymentId}`;
  const outcome = await IdempotencyService.execute({
    scopeId: session.userId, operation, method: req.method, signal: req.signal, key, request: body,
    retentionHours: Number(process.env.REFUND_IDEMPOTENCY_RETENTION_HOURS || 720),
    handler: async (tx) => {
      const refund = await RefundService.create(tx, { ...body, userId: session.userId, idempotencyKey: key });
      return { status: 201, body: refund, resourceType: 'refund', resourceId: refund.id };
    },
  });
  return NextResponse.json(outcome.body, { status: outcome.status, headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined });
});