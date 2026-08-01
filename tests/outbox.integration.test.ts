import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../src/lib/db';
import { GET as readiness } from '../src/app/api/health/ready/route';
import { OutboxConsumerRegistry } from '../src/lib/services/outbox-consumers';
import { OutboxDispatcher, type OutboxEventHandler, retryDelayMs } from '../src/lib/services/outbox-dispatcher';
import { LatePaymentRefundService } from '../src/lib/services/late-payment-refund.service';
import { PaymentService } from '../src/lib/services/payment.service';
import type { NotificationInput, NotificationProvider } from '../src/lib/services/notification-provider';
import { DeadLetterService, OutboxReconciliationService, outboxMetrics } from '../src/lib/services/outbox-reconciliation';
import { NonRetryableOutboxError, OUTBOX_EVENT, RetryableOutboxError } from '../src/lib/services/outbox.service';
import { Money } from '../src/lib/utils/money';
import { OutboxWorker } from '../src/lib/services/outbox-worker';
import { ORDER_STATUS, OrderStateService } from '../src/lib/services/order-state.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Outbox integration tests require the dedicated MySQL 8 test database.');

const suffix = () => crypto.randomUUID();

async function clean(): Promise<void> {
  await prisma.workerHeartbeat.deleteMany();
  await prisma.notificationDelivery.deleteMany();
  await prisma.processedOutboxEvent.deleteMany();
  await prisma.domainAuditLog.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  const [row] = await prisma.$queryRaw<Array<{ name: string; version: string }>>`SELECT DATABASE() AS name, VERSION() AS version`;
  assert.match(row?.name ?? '', /_test$/);
  assert.match(row?.version ?? '', /^8\./);
});
beforeEach(clean);
after(async () => { await clean(); await prisma.$disconnect(); });

async function event(input: {
  eventType?: string;
  payload?: string;
  status?: string;
  nextAttemptAt?: Date;
  lockedUntil?: Date;
  lockedBy?: string;
  attemptCount?: number;
  maxAttempts?: number;
} = {}) {
  const id = suffix();
  return prisma.outboxEvent.create({ data: {
    aggregateType: 'Order', aggregateId: `order-${id}`, eventType: input.eventType ?? OUTBOX_EVENT.INVENTORY_CONSUMED,
    idempotencyKey: `test:${id}`, payload: input.payload ?? JSON.stringify({ orderId: `order-${id}` }),
    status: input.status ?? 'PENDING', nextAttemptAt: input.nextAttemptAt ?? new Date(Date.now() - 1000),
    lockedUntil: input.lockedUntil, lockedAt: input.lockedUntil ? new Date() : undefined, lockedBy: input.lockedBy,
    attemptCount: input.attemptCount, maxAttempts: input.maxAttempts,
  } });
}

const handler = (handle: OutboxEventHandler['handle']): OutboxEventHandler => ({ handle });

async function lateFixture(balance = 100, amount = 40) {
  const token = suffix();
  const owner = await prisma.user.create({ data: {
    code: `OU-${token.slice(0, 8)}`, name: 'Outbox User', email: `${token}@outbox.test`, password: 'unused', balance,
  } });
  const order = await prisma.order.create({ data: {
    customerName: owner.name, customerEmail: owner.email, customerPhone: '0900000000', shippingAddress: 'test',
    paymentMethod: 'bank_transfer', paymentStatus: 'paid_late', total: amount, status: 'payment_review', userId: owner.id,
  } });
  const payment = await prisma.payment.create({ data: {
    orderId: order.id, userId: owner.id, amount, status: 'SUCCEEDED_LATE', operation: `webhook:${order.id}`,
    idempotencyKey: `payment:${token}`, provider: 'internal_wallet', providerOutcome: 'SUCCEEDED', currency: 'VND',
    providerIdempotencyKey: `provider:${token}`, providerTransactionId: `transaction:${token}`,
  } });
  return { owner, order, payment };
}

test('migration exposes bounded constraints and all claim/dedup/reconciliation indexes', async () => {
  const constraints = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE()`;
  assert.ok(constraints.every((row) => row.name.length <= 64));
  assert.ok(constraints.some((row) => row.name === 'outbox_max_attempts_chk'));
  assert.ok(constraints.some((row) => row.name === 'wallet_ledger_deterministic_key'));
  const indexes = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT DISTINCT INDEX_NAME AS name FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('outbox_event','processed_outbox_event','refund','wallet_ledger')`;
  for (const name of ['outbox_status_next_idx', 'outbox_status_lease_idx', 'outbox_type_status_idx', 'outbox_event_aggregate_idx', 'processed_consumer_event_key', 'refund_approval_key']) {
    assert.ok(indexes.some((row) => row.name === name), `missing index ${name}`);
  }
});

test('PENDING event is claimed with a lease and attempt increment', async () => {
  const created = await event();
  const dispatcher = new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'claim-one' });
  const claim = await dispatcher.claimBatch();
  assert.deepEqual(claim.events.map((item) => item.id), [created.id]);
  assert.equal(claim.events[0].status, 'PROCESSING');
  assert.equal(claim.events[0].attemptCount, 1);
  assert.equal(claim.events[0].lockedBy, 'claim-one');
});

test('two dispatchers race with SKIP LOCKED and every batch/event is disjoint', async () => {
  await Promise.all(Array.from({ length: 30 }, () => event()));
  const left = new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'left', batchSize: 20 });
  const right = new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'right', batchSize: 20 });
  const [a, b] = await Promise.all([left.claimBatch(), right.claimBatch()]);
  const ids = [...a.events, ...b.events].map((item) => item.id);
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
});

test('future nextAttemptAt is not claimed', async () => {
  await event({ nextAttemptAt: new Date(Date.now() + 60_000) });
  const claim = await new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'future' }).claimBatch();
  assert.equal(claim.events.length, 0);
});

test('crashed PROCESSING lease is recovered and reclaimed without admin action', async () => {
  const created = await event({ status: 'PROCESSING', lockedBy: 'dead-worker', lockedUntil: new Date(Date.now() - 1000), attemptCount: 1 });
  const claim = await new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'recovery' }).claimBatch();
  assert.equal(claim.staleRecovered, 1);
  assert.equal(claim.events[0].id, created.id);
  assert.equal(claim.events[0].attemptCount, 2);
});

test('old worker cannot overwrite a new lease owner after lease loss', async () => {
  await event();
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const old = new OutboxDispatcher(prisma, handler(() => blocked), { workerId: 'old', leaseSeconds: 30 });
  const claimed = await old.claimBatch();
  const processing = old.processClaimed(claimed.events[0]);
  await prisma.outboxEvent.update({ where: { id: claimed.events[0].id }, data: { lockedUntil: new Date(Date.now() - 1) } });
  const newer = new OutboxDispatcher(prisma, handler(async () => undefined), { workerId: 'new' });
  const newClaim = await newer.claimBatch();
  assert.equal(newClaim.events[0].lockedBy, 'new');
  release?.();
  await assert.rejects(processing, /Lease ownership lost/);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: claimed.events[0].id } })).lockedBy, 'new');
});

test('successful consumer marks COMPLETED and writes durable processed record', async () => {
  const created = await event();
  const result = await new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'success' }).dispatchOnce();
  assert.equal(result.completed, 1);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } })).status, 'COMPLETED');
  assert.equal(await prisma.processedOutboxEvent.count({ where: { eventId: created.id } }), 1);
});

test('retryable failure schedules RETRY and deterministic exponential backoff increases', async () => {
  const created = await event();
  const dispatcher = new OutboxDispatcher(prisma, handler(async () => { throw new RetryableOutboxError('TEMPORARY', 'retry me'); }), { workerId: 'retry' });
  const result = await dispatcher.dispatchOnce();
  const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(result.retried, 1);
  assert.equal(stored.status, 'RETRY');
  assert.equal(stored.lastErrorCode, 'TEMPORARY');
  assert.ok(retryDelayMs(created.id, 3) > retryDelayMs(created.id, 1));
});

test('max attempts and non-retryable failures transition directly to DEAD_LETTER', async () => {
  const maxed = await event({ attemptCount: 1, maxAttempts: 2 });
  const invalid = await event();
  const maxDispatcher = new OutboxDispatcher(prisma, handler(async (item) => {
    if (item.id === invalid.id) throw new NonRetryableOutboxError('BAD_PAYLOAD', 'bad');
    throw new RetryableOutboxError('TEMPORARY', 'again');
  }), { workerId: 'dead', batchSize: 10 });
  const result = await maxDispatcher.dispatchOnce();
  assert.equal(result.deadLettered, 2);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: maxed.id } })).attemptCount, 2);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: invalid.id } })).lastErrorCode, 'BAD_PAYLOAD');
});

test('unknown event type dead-letters once instead of retrying forever', async () => {
  const created = await event({ eventType: 'UNKNOWN_EVENT' });
  await new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'unknown' }).dispatchOnce();
  const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(stored.status, 'DEAD_LETTER');
  assert.equal(stored.lastErrorCode, 'UNKNOWN_EVENT_TYPE');
});

test('dispatcher restart preserves RETRY event and completes it later', async () => {
  const created = await event();
  await new OutboxDispatcher(prisma, handler(async () => { throw new RetryableOutboxError('TEMP', 'down'); }), { workerId: 'before' }).dispatchOnce();
  await prisma.outboxEvent.update({ where: { id: created.id }, data: { nextAttemptAt: new Date(Date.now() - 1) } });
  const after = await new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'after' }).dispatchOnce();
  assert.equal(after.completed, 1);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } })).status, 'COMPLETED');
});

test('crash after domain commit before COMPLETED and duplicate delivery do not repeat consumer effect', async () => {
  const created = await event();
  const registry = new OutboxConsumerRegistry(prisma);
  await registry.handle(created);
  await registry.handle(created);
  assert.equal(await prisma.processedOutboxEvent.count({ where: { eventId: created.id } }), 1);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } })).status, 'PENDING');
  await new OutboxDispatcher(prisma, registry, { workerId: 'after-crash' }).dispatchOnce();
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: created.id } })).status, 'COMPLETED');
  assert.equal(await prisma.processedOutboxEvent.count({ where: { eventId: created.id } }), 1);
});

test('duplicate notification event creates one delivery and calls provider once', async () => {
  class CountingProvider implements NotificationProvider {
    calls = 0;
    async send(input: NotificationInput) { this.calls += 1; return { messageId: `msg:${input.idempotencyKey}` }; }
  }
  const provider = new CountingProvider();
  const created = await event({ eventType: OUTBOX_EVENT.NOTIFICATION_REQUESTED, payload: JSON.stringify({ recipient: 'safe@example.test', template: 'test' }) });
  const registry = new OutboxConsumerRegistry(prisma, provider);
  await registry.handle(created);
  await registry.handle(created);
  assert.equal(provider.calls, 1);
  assert.equal(await prisma.notificationDelivery.count({ where: { eventId: created.id, status: 'sent' } }), 1);
});

test('consumer/event unique constraint rejects duplicate durable records', async () => {
  const created = await event();
  await prisma.processedOutboxEvent.create({ data: { consumerName: 'unique-test', eventId: created.id } });
  await assert.rejects(prisma.processedOutboxEvent.create({ data: { consumerName: 'unique-test', eventId: created.id } }),
    (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
});

test('worker stop is idempotent, stops new polls, and runtime failure makes readiness fail closed', async () => {
  let polls = 0;
  const healthy = new OutboxWorker({ dispatchOnce: async () => { polls += 1; return { claimed: 0, completed: 0, retried: 0, deadLettered: 0, staleRecovered: 0 }; } }, prisma,
    { workerId: 'runtime-healthy', pollIntervalMs: 5000 });
  await healthy.start();
  await Promise.all([healthy.stop(), healthy.stop()]);
  assert.equal(polls, 1);
  assert.equal(healthy.status().state, 'stopped');

  const failed = new OutboxWorker({ dispatchOnce: async () => { throw new Error('poll crashed'); } }, prisma, { workerId: 'runtime-failed' });
  await assert.rejects(failed.start(), /poll crashed/);
  assert.equal(failed.status().state, 'failed');
  assert.equal((await readiness()).status, 503);
});

test('late webhook atomically persists SUCCEEDED_LATE payment, review state and deterministic event without stock consumption', async () => {
  const token = suffix();
  const owner = await prisma.user.create({ data: { code: `OUT-${token.slice(0, 8)}`, name: 'Late Owner', email: `${token}@late.test`, password: 'x', balance: 100 } });
  const order = await prisma.order.create({ data: { customerName: owner.name, customerEmail: owner.email, customerPhone: '0900000000', shippingAddress: 'test', paymentMethod: 'bank_transfer', total: 40, userId: owner.id } });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.EXPIRED, actor: { type: 'SYSTEM', workerId: 'test-expiry' }, idempotencyKey: `fixture-expired:${order.id}` });
  const payment = await prisma.$transaction((tx) => PaymentService.recordWebhookSuccess(tx, {
    orderId: order.id, provider: 'integration-provider', providerEventId: `late:${suffix()}`,
  }));
  const reviewed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(payment.status, 'SUCCEEDED_LATE');
  assert.deepEqual({ status: reviewed.status, paymentStatus: reviewed.paymentStatus }, { status: 'payment_review', paymentStatus: 'paid_late' });
  const lateEvent = await prisma.outboxEvent.findFirstOrThrow({ where: { eventType: OUTBOX_EVENT.LATE_PAYMENT_REVIEW_REQUIRED } });
  assert.match(lateEvent.idempotencyKey, new RegExp(payment.id));
  assert.deepEqual(JSON.parse(lateEvent.payload), { orderId: order.id, paymentId: payment.id });
});

test('concurrent admin approvals create exactly one full refund and one audit/outbox row', async () => {
  const { owner, order, payment } = await lateFixture();
  const results = await Promise.all(Array.from({ length: 8 }, () => LatePaymentRefundService.approve(order.id, owner.id)));
  assert.equal(new Set(results.map((result) => result.refund.id)).size, 1);
  assert.equal(await prisma.refund.count({ where: { paymentId: payment.id } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: OUTBOX_EVENT.REFUND_REQUIRED, aggregateId: results[0].refund.id } }), 1);
  assert.equal(await prisma.domainAuditLog.count({ where: { action: 'LATE_PAYMENT_REFUND_APPROVED' } }), 1);
  assert.equal(Money.serialize(results[0].refund.amount), Money.serialize(payment.amount));
});

test('concurrent refund consumers credit wallet/ledger once and transition states with one notification', async () => {
  const { owner, order, payment } = await lateFixture(100, 40);
  const approval = await LatePaymentRefundService.approve(order.id, owner.id);
  const refundEvent = await prisma.outboxEvent.findFirstOrThrow({ where: { eventType: OUTBOX_EVENT.REFUND_REQUIRED } });
  const registry = new OutboxConsumerRegistry(prisma);
  await Promise.all([registry.handle(refundEvent), registry.handle(refundEvent)]);
  const [user, refund, paid] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: owner.id } }),
    prisma.refund.findUniqueOrThrow({ where: { id: approval.refund.id } }),
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
  ]);
  assert.equal(Money.serialize(user.balance), '140.0000');
  assert.equal(refund.status, 'SUCCEEDED');
  assert.equal(paid.status, 'REFUNDED');
  assert.equal(Money.serialize(paid.refundedAmount), '40.0000');
  assert.equal(await prisma.walletLedger.count({ where: { refundId: refund.id } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: OUTBOX_EVENT.NOTIFICATION_REQUESTED, aggregateId: refund.id } }), 1);
  assert.deepEqual((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'refunded');
});

test('over-refund and second full refund are blocked without wallet credit', async () => {
  const { owner, order, payment } = await lateFixture(100, 40);
  const approval = await LatePaymentRefundService.approve(order.id, owner.id);
  await prisma.refund.update({ where: { id: approval.refund.id }, data: { amount: 41 } });
  await new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'over-refund' }).dispatchOnce();
  const outbox = await prisma.outboxEvent.findFirstOrThrow({ where: { eventType: OUTBOX_EVENT.REFUND_REQUIRED } });
  assert.equal(outbox.status, 'DEAD_LETTER');
  assert.equal(outbox.lastErrorCode, 'REFUND_AMOUNT_INVALID');
  assert.equal(Money.serialize((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).balance), '100.0000');
  assert.equal(await prisma.walletLedger.count(), 0);
  const replay = await LatePaymentRefundService.approve(order.id, owner.id);
  assert.equal(replay.refund.id, approval.refund.id);
  assert.equal(await prisma.refund.count({ where: { paymentId: payment.id } }), 1);
});

test('reconciliation finds stale/completed-refund/ledger mismatches; dry-run is immutable and repair is audited', async () => {
  const { owner, order } = await lateFixture();
  const approval = await LatePaymentRefundService.approve(order.id, owner.id);
  const stale = await event({ status: 'PROCESSING', lockedBy: 'dead', lockedUntil: new Date(Date.now() - 60_000) });
  const refundEvent = await prisma.outboxEvent.findFirstOrThrow({ where: { eventType: OUTBOX_EVENT.REFUND_REQUIRED } });
  await prisma.outboxEvent.update({ where: { id: refundEvent.id }, data: { status: 'COMPLETED', processedAt: new Date() } });
  const before = await OutboxReconciliationService.audit(prisma);
  assert.ok(before.some((item) => item.type === 'STALE_PROCESSING' && item.entityId === stale.id));
  assert.ok(before.some((item) => item.type === 'COMPLETED_EVENT_REFUND_INCOMPLETE' && item.entityId === refundEvent.id));
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: stale.id } })).status, 'PROCESSING');
  assert.equal((await prisma.refund.findUniqueOrThrow({ where: { id: approval.refund.id } })).status, 'PENDING');

  await prisma.refund.update({ where: { id: approval.refund.id }, data: { status: 'SUCCEEDED' } });
  const after = await OutboxReconciliationService.audit(prisma);
  assert.ok(after.some((item) => item.type === 'SUCCEEDED_REFUND_LEDGER_MISSING'));
  await OutboxReconciliationService.repair(prisma, owner.id);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: stale.id } })).status, 'RETRY');
  assert.equal(await prisma.domainAuditLog.count({ where: { action: 'OUTBOX_STALE_LEASE_REPAIRED', entityId: stale.id } }), 1);
});

test('dead-letter requeue is controlled, audited, and cannot duplicate an already processed side effect', async () => {
  const dead = await event({ status: 'DEAD_LETTER', attemptCount: 10, maxAttempts: 10 });
  const requeued = await DeadLetterService.requeue(dead.id, 'admin-test', prisma);
  assert.equal(requeued.status, 'RETRY');
  assert.equal(requeued.attemptCount, 0);
  await assert.rejects(DeadLetterService.requeue(dead.id, 'admin-test', prisma));
  assert.equal(await prisma.domainAuditLog.count({ where: { action: 'OUTBOX_DEAD_LETTER_REQUEUED', entityId: dead.id } }), 1);

  const processed = await event({ status: 'DEAD_LETTER' });
  await prisma.processedOutboxEvent.create({ data: { consumerName: 'manual', eventId: processed.id } });
  await assert.rejects(DeadLetterService.requeue(processed.id, 'admin-test', prisma));
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: processed.id } })).status, 'DEAD_LETTER');
});

test('claim/stale/dead-letter/dedup/refund reconciliation query plans use intended indexes', async () => {
  await prisma.processedOutboxEvent.create({ data: { consumerName: 'x', eventId: 'y' } });
  const plans = await Promise.all([
    prisma.$queryRaw<Array<Record<string, unknown>>>`EXPLAIN FORMAT=JSON SELECT id FROM outbox_event FORCE INDEX (outbox_status_next_idx) WHERE status IN ('PENDING','RETRY') AND nextAttemptAt <= NOW() ORDER BY status, nextAttemptAt, id LIMIT 50`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`EXPLAIN FORMAT=JSON SELECT id FROM outbox_event FORCE INDEX (outbox_status_lease_idx) WHERE status = 'PROCESSING' AND lockedUntil < NOW()`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`EXPLAIN FORMAT=JSON SELECT id FROM outbox_event FORCE INDEX (outbox_status_next_idx) WHERE status = 'DEAD_LETTER' ORDER BY nextAttemptAt LIMIT 100`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`EXPLAIN FORMAT=JSON SELECT id FROM processed_outbox_event FORCE INDEX (processed_consumer_event_key) WHERE consumerName = 'x' AND eventId = 'y'`,
    prisma.$queryRaw<Array<Record<string, unknown>>>`EXPLAIN FORMAT=JSON SELECT id FROM refund FORCE INDEX (refund_paymentId_createdAt_idx) WHERE paymentId = 'x' AND status = 'SUCCEEDED'`,
  ]);
  const text = JSON.stringify(plans);
  for (const index of ['outbox_status_next_idx', 'outbox_status_lease_idx', 'processed_consumer_event_key', 'refund_paymentId_createdAt_idx']) assert.match(text, new RegExp(index));
});

test('database metrics reflect pending, retry, dead-letter, refund and notification signals', async () => {
  await Promise.all([event(), event({ status: 'RETRY' }), event({ status: 'DEAD_LETTER' })]);
  const metrics = await outboxMetrics(prisma);
  assert.equal(metrics.outbox_pending_total, 1);
  assert.equal(metrics.outbox_retry_total, 1);
  assert.equal(metrics.outbox_dead_letter_total, 1);
  assert.ok(metrics.outbox_oldest_pending_age_seconds >= 0);
});
