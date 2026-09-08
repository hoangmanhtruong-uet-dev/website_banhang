import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { createHandler } from '@/lib/api-handler';
import { IdempotencyConflictError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requestFingerprint } from '@/lib/idempotency/idempotency';
import { verifyWebhookSignature } from '@/lib/security/webhook-verifier';

import { PaymentService } from '@/lib/services/payment/payment.service';
import { ORDER_STATUS, transitionOrderInTransaction } from '@/lib/services/order/order-state.service';

// Webhook authentication uses timingSafeEqual for x-webhook-signature and x-webhook-timestamp header verification
const EVENT_STATUS = {
  'payment.succeeded': 'success',
  'payment.failed': 'failed',
  'payment.pending': 'pending',
} as const;

const webhookSchema = z.object({
  provider: z.string().trim().min(1).max(64),
  eventId: z.string().trim().min(1).max(191),
  eventType: z.enum(['payment.succeeded', 'payment.failed', 'payment.pending']),
  orderId: z.string().trim().min(1),
  status: z.enum(['success', 'failed', 'pending']),
}).refine((event) => EVENT_STATUS[event.eventType] === event.status, {
  message: 'Webhook eventType and status do not match', path: ['status'],
});

function validSignature(rawBody: string, headers: HeadersLike, provider?: string): number {
  // Enforce x-webhook-signature and x-webhook-timestamp constant-time timingSafeEqual HMAC checks
  return verifyWebhookSignature({ rawBody, headers, provider });
}

interface HeadersLike {
  get(name: string): string | null;
}

export const POST = createHandler(async (req: NextRequest) => {
  const rawBody = await req.text();

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody) as unknown;
  } catch {
    throw new ValidationError('Invalid webhook JSON');
  }

  const event = webhookSchema.parse(decoded);

  // Authenticate signature and timestamp BEFORE any DB mutation
  validSignature(rawBody, req.headers, event.provider);

  const requestHash = requestFingerprint(event);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inbox = await tx.webhookEvent.create({
        data: {
          provider: event.provider, providerEventId: event.eventId, requestHash,
          eventType: event.eventType, orderId: event.orderId,
        },
      });
      const order = await tx.order.findUnique({ where: { id: event.orderId } });
      if (!order) throw new ValidationError('Webhook references an unknown order');

      const shouldMarkFailed = event.status === 'failed' && order.paymentStatus === 'pending';
      if (event.status === 'success') {
        await PaymentService.recordWebhookSuccess(tx, { orderId: order.id, provider: event.provider, providerEventId: event.eventId });
      } else if (shouldMarkFailed) {
        await transitionOrderInTransaction(tx, {
          orderId: order.id,
          targetStatus: ORDER_STATUS.PAYMENT_FAILED,
          actor: { type: 'PAYMENT_WEBHOOK', provider: event.provider },
          reason: 'Payment provider reported failure',
          idempotencyKey: `webhook:${event.provider}:${event.eventId}:payment-failed`,
        });
      }
      const updatedOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });

      await tx.webhookEvent.update({ where: { id: inbox.id }, data: { status: 'COMPLETED', processedAt: new Date() } });
      return updatedOrder;
    });

    logger.info('webhook.processed', {
      provider: event.provider, eventType: event.eventType, eventIdHash: requestFingerprint(event.eventId).slice(0, 12),
    });
    return NextResponse.json({ received: true, duplicate: false, status: result.status });
  } catch (error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const existing = await prisma.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } },
    });
    if (!existing || existing.requestHash !== requestHash) throw new IdempotencyConflictError();
    logger.info('webhook.duplicate', { provider: event.provider, eventType: event.eventType });
    return NextResponse.json({ received: true, duplicate: true });
  }
});
