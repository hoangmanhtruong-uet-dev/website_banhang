import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '@/lib/db';
import { OutboxDispatcher } from '@/lib/services/outbox/outbox-dispatcher';
import { enqueueOutboxEvent, OUTBOX_EVENT, NonRetryableOutboxError } from '@/lib/services/outbox/outbox.service';
import { OutboxConsumerRegistry } from '@/lib/services/outbox/outbox-consumers';
import type { OutboxEvent } from '@prisma/client';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Integration tests require RUN_IDEMPOTENCY_INTEGRATION=1 and a dedicated *_test database.');
}

const suffix = () => crypto.randomUUID();

async function assertTestDatabase() {
  const rows = await prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT DATABASE() AS databaseName`;
  assert.match(rows[0]?.databaseName ?? '', /_test$/);
}

async function cleanDomainData() {
  await prisma.workerHeartbeat.deleteMany();
  await prisma.notificationDelivery.deleteMany();
  await prisma.processedOutboxEvent.deleteMany();
  await prisma.domainAuditLog.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await assertTestDatabase();
  await cleanDomainData();
});

after(async () => {
  await cleanDomainData();
  await prisma.$disconnect();
});

// 1. Concurrent Worker Atomic Claim (SKIP LOCKED)
test('1. Three concurrent workers claim batch -> disjoint event sets, zero duplicate claims', async () => {
  const events = [];
  for (let i = 0; i < 15; i++) {
    const event = await prisma.$transaction(async (tx) => {
      return enqueueOutboxEvent(tx, {
        eventType: OUTBOX_EVENT.INVENTORY_RESERVED,
        aggregateType: 'Order',
        aggregateId: `order-${suffix()}`,
        idempotencyKey: `idem-claim-${suffix()}`,
        payload: { orderId: `order-${suffix()}`, expiresAt: new Date().toISOString() },
      });
    });
    events.push(event);
  }

  const dispatcherA = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-A', batchSize: 5 });
  const dispatcherB = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-B', batchSize: 5 });
  const dispatcherC = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-C', batchSize: 5 });

  // Run claimBatch in parallel
  const [claimA, claimB, claimC] = await Promise.all([
    dispatcherA.claimBatch(),
    dispatcherB.claimBatch(),
    dispatcherC.claimBatch(),
  ]);

  const idsA = new Set(claimA.events.map((e) => e.id));
  const idsB = new Set(claimB.events.map((e) => e.id));
  const idsC = new Set(claimC.events.map((e) => e.id));

  // Verify total claimed = 15
  assert.equal(idsA.size + idsB.size + idsC.size, 15);

  // Verify disjoint sets (no overlap)
  for (const id of idsA) {
    assert.equal(idsB.has(id), false);
    assert.equal(idsC.has(id), false);
  }
  for (const id of idsB) {
    assert.equal(idsC.has(id), false);
  }
});

// 2. Worker Crash & Reclaim after Lease Expiration
test('2. Worker crashes mid-processing -> event reclaimed by another worker after lease expires', async () => {
  const event = await prisma.$transaction(async (tx) => {
    return enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_RESERVED,
      aggregateType: 'Order',
      aggregateId: `order-${suffix()}`,
      idempotencyKey: `idem-crash-${suffix()}`,
      payload: { orderId: `order-${suffix()}`, expiresAt: new Date().toISOString() },
    });
  });

  const dispatcherCrash = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-crash', leaseSeconds: 1 });
  const claim1 = await dispatcherCrash.claimBatch();
  assert.equal(claim1.events.length, 1);
  assert.equal(claim1.events[0].id, event.id);

  // Simulate worker crash: do NOT call complete or fail.
  // Wait 1.1s for lease to expire
  await new Promise((r) => setTimeout(r, 1100));

  const dispatcherRecover = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-recover', leaseSeconds: 60 });
  const claim2 = await dispatcherRecover.claimBatch();

  assert.equal(claim2.staleRecovered >= 1, true, 'Stale lease must be recovered');
  assert.equal(claim2.events.length, 1);
  assert.equal(claim2.events[0].id, event.id);
  assert.equal(claim2.events[0].lockedBy, 'worker-recover');
});

// 3. Side-Effect Idempotency (ProcessedOutboxEvent & NotificationDelivery)
test('3. Re-processing an event after crash does NOT duplicate external notifications or side effects', async () => {
  const event = await prisma.$transaction(async (tx) => {
    return enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.NOTIFICATION_REQUESTED,
      aggregateType: 'Order',
      aggregateId: `order-${suffix()}`,
      idempotencyKey: `idem-notif-${suffix()}`,
      payload: { channel: 'email', recipient: 'customer@example.test', template: 'order-confirmed', orderId: `order-${suffix()}` },
    });
  });

  const registry = new OutboxConsumerRegistry(prisma);
  const dispatcher = new OutboxDispatcher(prisma, registry, { workerId: 'worker-notif' });

  // 1st dispatch
  const claim1 = await dispatcher.claimBatch();
  await dispatcher.processClaimed(claim1.events[0]);

  const deliveryCount1 = await prisma.notificationDelivery.count({ where: { eventId: event.id } });
  const processedCount1 = await prisma.processedOutboxEvent.count({ where: { eventId: event.id } });
  assert.equal(deliveryCount1, 1);
  assert.equal(processedCount1, 1);

  // Manually reset event status back to PROCESSING to simulate re-execution after crash/reclaim
  await prisma.outboxEvent.update({
    where: { id: event.id },
    data: { status: 'PROCESSING', lockedBy: 'worker-notif-2', lockedUntil: new Date(Date.now() + 60_000) },
  });

  const dispatcher2 = new OutboxDispatcher(prisma, registry, { workerId: 'worker-notif-2' });
  const refetchedEvent = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
  
  // 2nd dispatch of same event
  await dispatcher2.processClaimed(refetchedEvent);

  const deliveryCount2 = await prisma.notificationDelivery.count({ where: { eventId: event.id } });
  const processedCount2 = await prisma.processedOutboxEvent.count({ where: { eventId: event.id } });

  assert.equal(deliveryCount2, 1, 'NotificationDelivery count MUST remain 1 (no duplicate email sending)');
  assert.equal(processedCount2, 1, 'ProcessedOutboxEvent count MUST remain 1');
});

// 4. Permanent Failure & Dead Letter Isolation
test('4. Non-retryable permanent failure -> dead-lettered immediately without blocking queue', async () => {
  const poisonEvent = await prisma.$transaction(async (tx) => {
    return enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.REFUND_REQUIRED,
      aggregateType: 'Refund',
      aggregateId: `refund-${suffix()}`,
      idempotencyKey: `idem-poison-${suffix()}`,
      payload: { orderId: 'non-existent-order', paymentId: 'non-existent-payment', refundId: 'non-existent-refund' },
    });
  });

  const dispatcher = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'worker-poison' });
  const claim = await dispatcher.claimBatch();
  assert.equal(claim.events.length, 1);

  const outcome = await dispatcher.processClaimed(claim.events[0]);
  assert.equal(outcome, 'dead-lettered');

  const updatedPoison = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: poisonEvent.id } });
  assert.equal(updatedPoison.status, 'DEAD_LETTER');
  assert.equal(updatedPoison.lastErrorCode, 'PAYMENT_NOT_FOUND');
});
