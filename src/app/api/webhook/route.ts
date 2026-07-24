import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, IdempotencyConflictError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requestFingerprint } from '@/lib/idempotency';

import { PaymentService } from '@/lib/services/payment.service';
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

function parseTimestamp(value: string | null): number {
  if (!value || !/^\d{10}$/.test(value)) throw new AuthenticationError('Invalid webhook timestamp');
  const timestamp = Number(value);
  const configuredTolerance = Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
  const tolerance = Number.isFinite(configuredTolerance) && configuredTolerance > 0 ? Math.min(configuredTolerance, 3600) : 300;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) throw new AuthenticationError('Webhook timestamp is outside the allowed tolerance');
  return timestamp;
}

function validSignature(rawBody: string, timestamp: number, signature: string | null, secret: string): boolean {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export const POST = createHandler(async (req: NextRequest) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || secret.length < 32) throw new AuthenticationError('Webhook authentication is not configured');
  const rawBody = await req.text();
  const timestamp = parseTimestamp(req.headers.get('x-webhook-timestamp'));
  if (!validSignature(rawBody, timestamp, req.headers.get('x-webhook-signature'), secret)) {
    throw new AuthenticationError('Invalid webhook signature');
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody) as unknown;
  } catch {
    throw new ValidationError('Invalid webhook JSON');
  }
  const event = webhookSchema.parse(decoded);
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
      if (event.status === 'success') await PaymentService.recordWebhookSuccess(tx, { orderId: order.id, provider: event.provider, providerEventId: event.eventId });
      else if (shouldMarkFailed) await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'failed' } });
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
