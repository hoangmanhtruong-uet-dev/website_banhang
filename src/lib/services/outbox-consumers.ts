import { Prisma, type OutboxEvent, type PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { Money } from '@/lib/utils/money';
import type { NotificationProvider } from '@/lib/services/notification-provider';
import { LogNotificationProvider } from '@/lib/services/notification-provider';
import {
  enqueueOutboxEvent,
  NonRetryableOutboxError,
  notificationPayloadSchema,
  OUTBOX_EVENT,
  parseOutboxPayload,
  refundRequiredPayloadSchema,
  resultHash,
} from '@/lib/services/outbox.service';

export type OutboxConsumer = {
  eventType: string;
  consumerName: string;
  handle(event: OutboxEvent): Promise<void>;
};

async function durableNoop(client: PrismaClient, event: OutboxEvent, consumerName: string, payload: unknown): Promise<void> {
  await client.$transaction(async (tx) => {
    const existing = await tx.processedOutboxEvent.findUnique({
      where: { consumerName_eventId: { consumerName, eventId: event.id } },
    });
    if (existing) return;
    await tx.processedOutboxEvent.create({
      data: { consumerName, eventId: event.id, resultHash: resultHash(payload) },
    });
  });
}

async function processRefund(client: PrismaClient, event: OutboxEvent, payload: unknown): Promise<void> {
  const input = refundRequiredPayloadSchema.parse(payload);
  const consumerName = 'internal-wallet-refund-v1';
  await client.$transaction(async (tx) => {

    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM payment WHERE id = ${input.paymentId} FOR UPDATE`);
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM refund WHERE id = ${input.refundId} FOR UPDATE`);
    const [payment, refund] = await Promise.all([
      tx.payment.findUnique({ where: { id: input.paymentId } }),
      tx.refund.findUnique({ where: { id: input.refundId } }),
    ]);
    if (!payment) throw new NonRetryableOutboxError('PAYMENT_NOT_FOUND', 'Refund payment does not exist');
    if (!refund || refund.paymentId !== payment.id) throw new NonRetryableOutboxError('REFUND_NOT_FOUND', 'Refund does not match payment');
    const processed = await tx.processedOutboxEvent.findUnique({
      where: { consumerName_eventId: { consumerName, eventId: event.id } },
    });
    if (processed) return;
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${refund.userId} FOR UPDATE`);

    if (refund.status === 'SUCCEEDED') {
      await tx.processedOutboxEvent.upsert({
        where: { consumerName_eventId: { consumerName, eventId: event.id } },
        create: { consumerName, eventId: event.id, resultHash: resultHash({ refundId: refund.id, status: refund.status }) }, update: {},
      });
      return;
    }
    if (!['PENDING', 'PROCESSING'].includes(refund.status)) {
      throw new NonRetryableOutboxError('INVALID_REFUND_STATE', `Refund state ${refund.status} cannot be processed`);
    }
    if (!['SUCCEEDED', 'SUCCEEDED_LATE', 'REFUND_PENDING', 'PARTIALLY_REFUNDED'].includes(payment.status)) {
      throw new NonRetryableOutboxError('INVALID_PAYMENT_STATE', `Payment state ${payment.status} cannot be refunded`);
    }
    if (refund.currency !== payment.currency) throw new NonRetryableOutboxError('CURRENCY_MISMATCH', 'Refund currency differs from payment');
    if (input.currency && input.currency !== refund.currency) throw new NonRetryableOutboxError('CURRENCY_MISMATCH', 'Payload currency differs from refund');
    if (input.amount && Money.compare(input.amount, refund.amount) !== 0) throw new NonRetryableOutboxError('REFUND_AMOUNT_INVALID', 'Payload amount differs from refund');
    const nextRefunded = Money.round(Money.add(payment.refundedAmount, refund.amount));
    if (!Money.isPositive(refund.amount) || Money.compare(nextRefunded, payment.amount) > 0) {
      throw new NonRetryableOutboxError('REFUND_AMOUNT_INVALID', 'Refund exceeds remaining payment amount');
    }

    const wallet = await tx.user.findUniqueOrThrow({ where: { id: refund.userId }, select: { balance: true, currency: true } });
    if (wallet.currency !== refund.currency) throw new NonRetryableOutboxError('CURRENCY_MISMATCH', 'Wallet currency differs from refund');
    const balanceAfter = Money.round(Money.add(wallet.balance, refund.amount));
    await tx.refund.update({ where: { id: refund.id }, data: { status: 'PROCESSING', sourceEventId: event.id } });
    await tx.user.update({ where: { id: refund.userId }, data: { balance: balanceAfter } });
    await tx.walletLedger.create({
      data: {
        userId: refund.userId, refundId: refund.id,
        deterministicKey: `refund:${refund.id}:wallet-credit`, referenceType: 'Refund', referenceId: refund.id,
        amount: refund.amount, balanceBefore: wallet.balance, balanceAfter,
        currency: refund.currency, entryType: 'REFUND_CREDIT',
      },
    });
    const fullyRefunded = Money.compare(nextRefunded, payment.amount) === 0;
    await tx.refund.update({
      where: { id: refund.id },
      data: { status: 'SUCCEEDED', providerOutcome: 'SUCCEEDED', providerRefundId: `wallet-refund:${refund.id}`, completedAt: new Date() },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { refundedAmount: nextRefunded, status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
    });
    if (fullyRefunded) {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'refunded', paymentStatus: 'refunded' } });
    }
    await tx.processedOutboxEvent.create({
      data: { consumerName, eventId: event.id, resultHash: resultHash({ refundId: refund.id, amount: Money.serialize(refund.amount), currency: refund.currency }) },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.NOTIFICATION_REQUESTED,
      aggregateType: 'Refund', aggregateId: refund.id, orderId: payment.orderId,
      idempotencyKey: `notification:refund-succeeded:${refund.id}`,
      payload: { recipient: order.customerEmail, template: 'refund-succeeded', orderId: payment.orderId, refundId: refund.id },
    });
  }, { maxWait: 10_000, timeout: 20_000 });
}

async function processNotification(
  client: PrismaClient,
  provider: NotificationProvider,
  event: OutboxEvent,
  payload: unknown,
): Promise<void> {
  const input = notificationPayloadSchema.parse(payload);
  const consumerName = 'notification-delivery-v1';
  const providerIdempotencyKey = `notification:${event.id}`;
  const prepared = await client.$transaction(async (tx) => {
    const processed = await tx.processedOutboxEvent.findUnique({
      where: { consumerName_eventId: { consumerName, eventId: event.id } },
    });
    if (processed) return { done: true as const, deliveryId: '' };
    const delivery = await tx.notificationDelivery.upsert({
      where: { consumerName_eventId: { consumerName, eventId: event.id } },
      create: {
        eventId: event.id, consumerName, idempotencyKey: `delivery:${event.id}`,
        providerIdempotencyKey, recipient: input.recipient, template: input.template,
      },
      update: {},
    });
    if (delivery.status === 'sent') {
      await tx.processedOutboxEvent.create({ data: { consumerName, eventId: event.id, resultHash: resultHash(delivery.providerMessageId) } });
      return { done: true as const, deliveryId: delivery.id };
    }
    return { done: false as const, deliveryId: delivery.id };
  });
  if (prepared.done) return;

  try {
    const result = await provider.send({
      recipient: input.recipient, template: input.template, idempotencyKey: providerIdempotencyKey,
      data: { ...(input.orderId ? { orderId: input.orderId } : {}), ...(input.refundId ? { refundId: input.refundId } : {}) },
    });
    await client.$transaction(async (tx) => {
      const processed = await tx.processedOutboxEvent.findUnique({
        where: { consumerName_eventId: { consumerName, eventId: event.id } },
      });
      if (processed) return;
      await tx.notificationDelivery.update({
        where: { id: prepared.deliveryId }, data: { status: 'sent', providerMessageId: result.messageId, sentAt: new Date(), lastError: null },
      });
      await tx.processedOutboxEvent.create({ data: { consumerName, eventId: event.id, resultHash: resultHash(result) } });
    });
  } catch (error: unknown) {
    await client.notificationDelivery.update({
      where: { id: prepared.deliveryId },
      data: { status: 'failed', lastError: error instanceof Error ? error.message.slice(0, 4000) : 'Unknown provider error' },
    });
    throw error;
  }
}

export class OutboxConsumerRegistry {
  private readonly consumers: ReadonlyMap<string, OutboxConsumer>;

  constructor(private readonly client: PrismaClient = prisma, provider: NotificationProvider = new LogNotificationProvider()) {
    const noop = (eventType: string, consumerName: string): OutboxConsumer => ({
      eventType, consumerName,
      handle: async (event) => durableNoop(client, event, consumerName, parseOutboxPayload(event)),
    });
    const entries: OutboxConsumer[] = [
      noop(OUTBOX_EVENT.INVENTORY_RESERVED, 'inventory-reserved-observer-v1'),
      noop(OUTBOX_EVENT.INVENTORY_CONSUMED, 'order-paid-observer-v1'),
      noop(OUTBOX_EVENT.INVENTORY_RESERVATION_EXPIRED, 'inventory-expired-observer-v1'),
      noop(OUTBOX_EVENT.ORDER_CANCELLED, 'order-cancelled-observer-v1'),
      noop(OUTBOX_EVENT.LATE_PAYMENT_REVIEW_REQUIRED, 'late-payment-review-v1'),
      { eventType: OUTBOX_EVENT.REFUND_REQUIRED, consumerName: 'internal-wallet-refund-v1', handle: (event) => processRefund(client, event, parseOutboxPayload(event)) },
      { eventType: OUTBOX_EVENT.NOTIFICATION_REQUESTED, consumerName: 'notification-delivery-v1', handle: (event) => processNotification(client, provider, event, parseOutboxPayload(event)) },
    ];
    this.consumers = new Map(entries.map((consumer) => [consumer.eventType, consumer]));
  }

  async handle(event: OutboxEvent): Promise<void> {
    const consumer = this.consumers.get(event.eventType);
    if (!consumer) throw new NonRetryableOutboxError('UNKNOWN_EVENT_TYPE', `No consumer registered for ${event.eventType}`);
    const startedAt = Date.now();
    await consumer.handle(event);
    logger.info('outbox.consumer.completed', { eventId: event.id, eventType: event.eventType, consumerName: consumer.consumerName, durationMs: Date.now() - startedAt });
  }
}
