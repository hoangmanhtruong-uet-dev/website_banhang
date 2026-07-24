import { Prisma, type PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { enqueueOutboxEvent, OUTBOX_EVENT } from '@/lib/services/outbox.service';
import { Money } from '@/lib/utils/money';

export interface OutboxAnomaly {
  type: string;
  entityId: string;
  detail: Readonly<Record<string, unknown>>;
}

function safeDeadLetterPayload(payload: string): Readonly<Record<string, string>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    return { payload: '[invalid-json]' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { payload: '[redacted]' };
  const source = parsed as Record<string, unknown>;
  const safe: Record<string, string> = {};
  for (const key of ['orderId', 'paymentId', 'refundId', 'template']) {
    if (typeof source[key] === 'string') safe[key] = source[key];
  }
  if (typeof source.recipient === 'string') {
    const at = source.recipient.lastIndexOf('@');
    safe.recipient = at > 0 ? `***${source.recipient.slice(at)}` : '[redacted]';
  }
  return safe;
}

export class OutboxReconciliationService {
  static async audit(client: PrismaClient = prisma, now = new Date(), limit = 500): Promise<OutboxAnomaly[]> {
    const take = Math.max(1, Math.min(limit, 5000));
    const retryCutoff = new Date(now.getTime() - 30 * 60_000);
    const anomalies: OutboxAnomaly[] = [];
    const [stale, retry, dead, completedRefunds, succeededRefunds, ledgers, refundedPayments, lateOrders] = await Promise.all([
      client.outboxEvent.findMany({ where: { status: 'PROCESSING', lockedUntil: { lt: now } }, take, orderBy: { lockedUntil: 'asc' } }),
      client.outboxEvent.findMany({ where: { status: 'RETRY', nextAttemptAt: { lt: retryCutoff } }, take, orderBy: { nextAttemptAt: 'asc' } }),
      client.outboxEvent.findMany({ where: { status: 'DEAD_LETTER' }, take, orderBy: { deadLetteredAt: 'asc' } }),
      client.outboxEvent.findMany({ where: { eventType: OUTBOX_EVENT.REFUND_REQUIRED, status: 'COMPLETED' }, take }),
      client.refund.findMany({ where: { status: 'SUCCEEDED' }, select: { id: true, walletLedger: { select: { id: true } } }, take }),
      client.walletLedger.findMany({ select: { id: true, refundId: true, refund: { select: { status: true } }, amount: true, balanceBefore: true, balanceAfter: true, currency: true }, take }),
      client.payment.findMany({ where: { status: { in: ['REFUNDED', 'refunded'] } }, include: { refunds: { where: { status: { in: ['SUCCEEDED', 'completed'] } } } }, take }),
      client.order.findMany({ where: { status: 'payment_review', paymentStatus: 'paid_late' }, include: { payment: { include: { refunds: true } } }, take }),
    ]);
    for (const event of stale) anomalies.push({ type: 'STALE_PROCESSING', entityId: event.id, detail: { lockedBy: event.lockedBy, lockedUntil: event.lockedUntil } });
    for (const event of retry) anomalies.push({ type: 'RETRY_OVERDUE', entityId: event.id, detail: { nextAttemptAt: event.nextAttemptAt, attemptCount: event.attemptCount } });
    for (const event of dead) anomalies.push({ type: 'UNRESOLVED_DEAD_LETTER', entityId: event.id, detail: { eventType: event.eventType, errorCode: event.lastErrorCode } });
    for (const event of completedRefunds) {
      const refund = await client.refund.findUnique({ where: { id: event.aggregateId } });
      if (!refund || refund.status !== 'SUCCEEDED') anomalies.push({ type: 'COMPLETED_EVENT_REFUND_INCOMPLETE', entityId: event.id, detail: { refundId: event.aggregateId } });
    }
    for (const refund of succeededRefunds) {
      if (!refund.walletLedger) anomalies.push({ type: 'SUCCEEDED_REFUND_LEDGER_MISSING', entityId: refund.id, detail: {} });
    }
    for (const ledger of ledgers) {
      if (ledger.refund && ledger.refund.status !== 'SUCCEEDED' && ledger.refund.status !== 'completed') {
        anomalies.push({ type: 'LEDGER_REFUND_INCOMPLETE', entityId: ledger.id, detail: { refundId: ledger.refundId, refundStatus: ledger.refund.status } });
      }
      const expectedAfter = Money.round(Money.add(ledger.balanceBefore, ledger.amount));
      if (Money.compare(expectedAfter, ledger.balanceAfter) !== 0) {
        anomalies.push({ type: 'WALLET_LEDGER_EQUATION_MISMATCH', entityId: ledger.id, detail: { expectedAfter: Money.serialize(expectedAfter), actualAfter: Money.serialize(ledger.balanceAfter), currency: ledger.currency } });
      }
    }
    for (const payment of refundedPayments) {
      const total = Money.round(Money.sum(payment.refunds.map((refund) => refund.amount)));
      if (Money.compare(total, payment.amount) !== 0) anomalies.push({ type: 'REFUNDED_PAYMENT_TOTAL_MISMATCH', entityId: payment.id, detail: { amount: Money.serialize(payment.amount), refundTotal: Money.serialize(total), currency: payment.currency } });
    }
    for (const order of lateOrders) {
      if (!order.payment || order.payment.refunds.length === 0) anomalies.push({ type: 'LATE_PAYMENT_UNDECIDED', entityId: order.id, detail: { paymentId: order.payment?.id ?? null } });
    }

    const missingOutboxRefunds = await client.refund.findMany({
      where: { status: 'PENDING', payment: { status: 'REFUND_PENDING' } },
      include: { payment: true }, take,
    });
    for (const refund of missingOutboxRefunds) {
      const key = `order:${refund.payment.orderId}:refund-required:${refund.paymentId}`;
      if (!(await client.outboxEvent.findUnique({ where: { idempotencyKey: key } }))) {
        anomalies.push({ type: 'REFUND_REQUIRED_OUTBOX_MISSING', entityId: refund.id, detail: { paymentId: refund.paymentId, orderId: refund.payment.orderId } });
      }
    }
    for (const anomaly of anomalies) logger.warn('outbox.reconciliation_anomaly', { type: anomaly.type, entityId: anomaly.entityId });
    return anomalies.slice(0, take);
  }

  static async repair(client: PrismaClient = prisma, actorId = 'system:outbox-reconcile'): Promise<OutboxAnomaly[]> {
    const anomalies = await this.audit(client);
    for (const anomaly of anomalies) {
      if (anomaly.type === 'STALE_PROCESSING') {
        await client.$transaction(async (tx) => {
          const changed = await tx.outboxEvent.updateMany({
            where: { id: anomaly.entityId, status: 'PROCESSING', lockedUntil: { lt: new Date() } },
            data: { status: 'RETRY', nextAttemptAt: new Date(), lockedAt: null, lockedUntil: null, lockedBy: null, lastErrorCode: 'STALE_LEASE_REPAIRED' },
          });
          if (changed.count === 1) await tx.domainAuditLog.create({ data: {
            action: 'OUTBOX_STALE_LEASE_REPAIRED', actorId, entityType: 'OutboxEvent', entityId: anomaly.entityId,
            details: JSON.stringify(anomaly.detail),
          } });
        });
      }
      if (anomaly.type === 'REFUND_REQUIRED_OUTBOX_MISSING') {
        await client.$transaction(async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM refund WHERE id = ${anomaly.entityId} FOR UPDATE`);
          const refund = await tx.refund.findUnique({ where: { id: anomaly.entityId }, include: { payment: true } });
          if (!refund || refund.status !== 'PENDING') return;
          await enqueueOutboxEvent(tx, {
            eventType: OUTBOX_EVENT.REFUND_REQUIRED, aggregateType: 'Refund', aggregateId: refund.id,
            orderId: refund.payment.orderId,
            idempotencyKey: `order:${refund.payment.orderId}:refund-required:${refund.paymentId}`,
            payload: { orderId: refund.payment.orderId, paymentId: refund.paymentId, refundId: refund.id, amount: Money.serialize(refund.amount), currency: refund.currency },
          });
          await tx.domainAuditLog.create({ data: {
            action: 'REFUND_OUTBOX_REPAIRED', actorId, entityType: 'Refund', entityId: refund.id,
            details: JSON.stringify({ paymentId: refund.paymentId, orderId: refund.payment.orderId }),
          } });
        });
      }
    }
    return anomalies;
  }
}

export class DeadLetterService {
  static async list(client: PrismaClient = prisma, limit = 100) {
    const events = await client.outboxEvent.findMany({
      where: { status: 'DEAD_LETTER' }, take: Math.max(1, Math.min(limit, 500)), orderBy: { deadLetteredAt: 'desc' },
      select: {
        id: true, eventType: true, aggregateType: true, aggregateId: true,
        attemptCount: true, maxAttempts: true, lastError: true, lastErrorCode: true,
        deadLetteredAt: true, createdAt: true, payload: true,
      },
    });
    return events.map(({ payload, ...event }) => ({ ...event, payload: safeDeadLetterPayload(payload) }));
  }

  static async requeue(eventId: string, actorId: string, client: PrismaClient = prisma) {
    return client.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM outbox_event WHERE id = ${eventId} FOR UPDATE`);
      const event = await tx.outboxEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundError('Dead-letter event not found');
      if (event.status !== 'DEAD_LETTER') throw new ConflictError('Only dead-letter events can be requeued');
      const processed = await tx.processedOutboxEvent.count({ where: { eventId } });
      if (processed > 0) throw new ConflictError('Event already has a durable processed record');
      const requeued = await tx.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'RETRY', attemptCount: 0, nextAttemptAt: new Date(),
          lockedAt: null, lockedUntil: null, lockedBy: null, processedAt: null, deadLetteredAt: null,
          lastError: null, lastErrorCode: null,
        },
      });
      await tx.domainAuditLog.create({ data: {
        action: 'OUTBOX_DEAD_LETTER_REQUEUED', actorId, entityType: 'OutboxEvent', entityId: eventId,
        details: JSON.stringify({ previousAttempts: event.attemptCount, previousErrorCode: event.lastErrorCode }),
      } });
      return requeued;
    });
  }
}

export async function outboxMetrics(client: PrismaClient = prisma, now = new Date()) {
  const grouped = await client.outboxEvent.groupBy({ by: ['status'], _count: { _all: true } });
  const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
  const oldest = await client.outboxEvent.findFirst({
    where: { status: { in: ['PENDING', 'RETRY'] } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
  });
  return {
    outbox_pending_total: counts.get('PENDING') ?? 0,
    outbox_retry_total: counts.get('RETRY') ?? 0,
    outbox_processing_total: counts.get('PROCESSING') ?? 0,
    outbox_dead_letter_total: counts.get('DEAD_LETTER') ?? 0,
    outbox_oldest_pending_age_seconds: oldest ? Math.max(0, Math.floor((now.getTime() - oldest.createdAt.getTime()) / 1000)) : 0,
    refund_required_total: await client.refund.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    refund_succeeded_total: await client.refund.count({ where: { status: { in: ['SUCCEEDED', 'completed'] } } }),
    refund_failed_total: await client.refund.count({ where: { status: 'FAILED' } }),
    late_payment_total: await client.payment.count({ where: { status: { in: ['SUCCEEDED_LATE', 'REFUND_PENDING'] } } }),
    notification_delivery_failure_total: await client.notificationDelivery.count({ where: { status: 'failed' } }),
  };
}
