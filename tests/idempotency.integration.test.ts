import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../src/lib/db';
import { IdempotencyService } from '../src/lib/services/idempotency.service';
import { OrderService, type CreateOrderInput } from '../src/lib/services/order.service';
import { PaymentService, RefundService } from '../src/lib/services/payment.service';
import { POST as webhookPost } from '../src/app/api/webhook/route';
import { Money } from '../src/lib/utils/money';
import { InventoryService } from '../src/lib/services/inventory.service';
import { ORDER_STATUS, OrderStateService } from '../src/lib/services/order-state.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Integration tests require RUN_IDEMPOTENCY_INTEGRATION=1 and a dedicated *_test database.');
}

const ids = { users: [] as string[], products: [] as string[], vouchers: [] as string[] };
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
  await prisma.inventoryReservation.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.product.deleteMany();
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

async function createUser(balance = 1_000) {
  const id = suffix();
  const user = await prisma.user.create({
    data: { code: `IT-${id.slice(0, 8)}`, name: 'Integration User', email: `${id}@example.test`, password: 'not-used', balance },
  });
  ids.users.push(user.id);
  return user;
}

async function createProduct(stockQuantity = 20, price = 10) {
  const id = suffix();
  const product = await prisma.product.create({
    data: { code: `P-${id.slice(0, 8)}`, slug: `idem-${id}`, name: 'Integration product', price, stockQuantity },
  });
  ids.products.push(product.id);
  return product;
}

async function createVoucher(userId: string, usageLimit = 1) {
  const id = suffix();
  const voucher = await prisma.voucher.create({
    data: {
      code: `V-${id.slice(0, 8)}`, discountType: 'fixed', discountValue: 5, minOrderValue: 0,
      startDate: new Date(Date.now() - 60_000), endDate: new Date(Date.now() + 86_400_000),
      usageLimit, sellerId: userId,
    },
  });
  ids.vouchers.push(voucher.id);
  return voucher;
}

function orderInput(userId: string, productId: string, key: string, overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    userId, idempotencyKey: key, customerName: 'Test User', customerEmail: 'test@example.test',
    customerPhone: '0900000000', shippingAddress: 'Integration test address', paymentMethod: 'COD',
    items: [{ productId, quantity: 2 }], ...overrides,
  };
}

async function executeOrder(input: CreateOrderInput, request: unknown = input) {
  return IdempotencyService.execute({
    scopeId: input.userId, operation: 'order:create', method: 'POST', key: input.idempotencyKey, request,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, input);
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });
}

async function createCodOrder(userId: string, productId: string) {
  const key = `order:${suffix()}`;
  return (await executeOrder(orderInput(userId, productId, key))).body;
}

test('migrations create real tables, unique indexes, foreign keys, and cleanup index', async () => {
  const tables = await prisma.$queryRaw<Array<{ tableName: string }>>`
    SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  const names = new Set(tables.map((row) => row.tableName));
  for (const expected of ['idempotency_record', 'payment', 'refund', 'webhook_event', 'order']) assert.ok(names.has(expected));

  const indexes = await prisma.$queryRaw<Array<{ indexName: string }>>`
    SELECT DISTINCT INDEX_NAME AS indexName FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'idempotency_record'`;
  const indexNames = new Set(indexes.map((row) => row.indexName));
  assert.ok(indexNames.has('idempotency_record_scopeId_operation_key_key'));
  assert.ok(indexNames.has('idempotency_record_expiresAt_idx'));
  assert.ok(indexNames.has('idempotency_record_status_expiresAt_idx'));
  assert.ok(indexes.every((row) => row.indexName.length <= 64));

  const columns = await prisma.$queryRaw<Array<{ columnName: string }>>`
    SELECT COLUMN_NAME AS columnName FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order' AND COLUMN_NAME IN ('idempotencyScope', 'idempotencyKey')`;
  assert.equal(columns.length, 2);

  const foreignKeys = await prisma.$queryRaw<Array<{ constraintName: string }>>`
    SELECT CONSTRAINT_NAME AS constraintName FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()`;
  assert.ok(foreignKeys.some((row) => row.constraintName === 'idempotency_record_scopeId_fkey'));
  assert.ok(foreignKeys.some((row) => row.constraintName === 'payment_orderId_fkey'));
  assert.ok(foreignKeys.some((row) => row.constraintName === 'refund_paymentId_fkey'));
  assert.ok(foreignKeys.every((row) => row.constraintName.length <= 64));
});

test('barrier forces four same-key checkouts to one order/payment/stock/voucher/balance mutation and exact replay', async () => {
  const user = await createUser();
  const product = await createProduct();
  const voucher = await createVoucher(user.id);
  const key = `barrier:${suffix()}`;
  const input = orderInput(user.id, product.id, key, { paymentMethod: 'Banking', voucherCode: voucher.code });
  const request = { ...input, userId: undefined, idempotencyKey: undefined };

  let signalClaimed!: () => void;
  let releaseWinner!: () => void;
  const claimed = new Promise<void>((resolve) => { signalClaimed = resolve; });
  const holdWinner = new Promise<void>((resolve) => { releaseWinner = resolve; });
  const first = IdempotencyService.execute({
    scopeId: user.id, operation: 'order:create', method: 'POST', key, request,
    handler: async (tx) => {
      signalClaimed();
      await holdWinner;
      const order = await OrderService.createOrderInTransaction(tx, input);
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });
  await claimed;
  const followers = Array.from({ length: 3 }, () => executeOrder(input, request));
  await new Promise<void>((resolve) => setImmediate(resolve));
  releaseWinner();
  const outcomes = await Promise.all([first, ...followers]);

  assert.equal(new Set(outcomes.map((outcome) => outcome.resourceId)).size, 1);
  assert.equal(outcomes.filter((outcome) => outcome.replayed).length, 3);
  assert.deepEqual(outcomes.map((outcome) => outcome.body), Array(4).fill(outcomes[0].body));
  assert.ok(outcomes.every((outcome) => outcome.status === 201));
  assert.equal(await prisma.order.count({ where: { userId: user.id, idempotencyKey: key } }), 1);
  assert.equal(await prisma.payment.count({ where: { orderId: outcomes[0].resourceId } }), 1);
  assert.equal(await prisma.idempotencyRecord.count({ where: { scopeId: user.id, operation: 'order:create', key } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 18);
  assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } })).usedCount, 1);
  assert.equal(Money.serialize((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).balance), '985.0000');
});

test('key scope separates payload, users, operations, and independent checkout keys', async () => {
  const [userOne, userTwo] = await Promise.all([createUser(), createUser()]);
  const product = await createProduct(30);
  const key = `scope:${suffix()}`;
  const input = orderInput(userOne.id, product.id, key);
  const first = await executeOrder(input);
  await assert.rejects(
    executeOrder({ ...input, items: [{ productId: product.id, quantity: 3 }] }),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'IDEMPOTENCY_KEY_REUSED',
  );
  const differentKey = await executeOrder({ ...input, idempotencyKey: `${key}:other` });
  const otherUser = await executeOrder(orderInput(userTwo.id, product.id, key));
  const otherOperation = await IdempotencyService.execute({
    scopeId: userOne.id, operation: 'test:other-operation', method: 'POST', key, request: { value: 1 },
    handler: async () => ({ status: 200, body: { ok: true } }),
  });
  assert.notEqual(first.resourceId, differentKey.resourceId);
  assert.notEqual(first.resourceId, otherUser.resourceId);
  assert.equal(otherOperation.replayed, false);
});

test('claim, inventory, and order failure injection rolls back every partial effect and retry succeeds', async () => {
  const user = await createUser();
  const product = await createProduct(20);

  const claimKey = `fail-claim:${suffix()}`;
  await assert.rejects(IdempotencyService.execute({
    scopeId: user.id, operation: 'order:create', method: 'POST', key: claimKey, request: { stage: 'claim' },
    handler: async () => { throw new Error('injected-after-claim'); },
  }));
  assert.equal(await prisma.idempotencyRecord.count({ where: { key: claimKey } }), 0);

  for (const stage of ['inventory', 'order'] as const) {
    const stockBeforeFailure = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity;
    const key = `fail-${stage}:${suffix()}`;
    const input = orderInput(user.id, product.id, key);
    await assert.rejects(IdempotencyService.execute({
      scopeId: user.id, operation: 'order:create', method: 'POST', key, request: input,
      handler: async (tx) => {
        const hooks = stage === 'inventory'
          ? { afterInventoryUpdate: () => { throw new Error('injected-after-inventory'); } }
          : { afterOrderCreation: () => { throw new Error('injected-after-order'); } };
        const order = await OrderService.createOrderInTransaction(tx, input, hooks);
        return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
      },
    }));
    assert.equal(await prisma.idempotencyRecord.count({ where: { key } }), 0);
    assert.equal(await prisma.order.count({ where: { idempotencyKey: key } }), 0);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, stockBeforeFailure);
    const retried = await executeOrder(input);
    assert.equal(retried.replayed, false);
  }
});

test('database connection loss rolls back the claim and every domain mutation', async () => {
  const user = await createUser();
  const product = await createProduct(20);
  const key = `disconnect:${suffix()}`;
  const input = orderInput(user.id, product.id, key);
  const victim = new PrismaClient();
  try {
    await assert.rejects(victim.$transaction(async (tx) => {
      const [connection] = await tx.$queryRaw<Array<{ connectionId: bigint }>>`SELECT CONNECTION_ID() AS connectionId`;
      await tx.idempotencyRecord.create({
        data: {
          key, scopeId: user.id, operation: 'order:create', method: 'POST', requestHash: '0'.repeat(64),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await OrderService.createOrderInTransaction(tx, input);
      const connectionId = Number(connection.connectionId);
      assert.ok(Number.isSafeInteger(connectionId));
      await prisma.$executeRawUnsafe(`KILL CONNECTION ${connectionId}`);
      await tx.$queryRaw`SELECT 1`;
    }, { timeout: 30_000 }));
  } finally {
    await victim.$disconnect();
  }
  assert.equal(await prisma.idempotencyRecord.count({ where: { key } }), 0);
  assert.equal(await prisma.order.count({ where: { idempotencyKey: key } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 20);
  assert.equal((await executeOrder(input)).replayed, false);
});

test('client abort after claim does not interrupt atomic commit and retry replays', async () => {
  const user = await createUser();
  const product = await createProduct();
  const key = `abort:${suffix()}`;
  const input = orderInput(user.id, product.id, key);
  const controller = new AbortController();
  let signalStarted!: () => void;
  let release!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  const held = new Promise<void>((resolve) => { release = resolve; });
  const attempt = IdempotencyService.execute({
    scopeId: user.id, operation: 'order:create', method: 'POST', key, request: input, signal: controller.signal,
    handler: async (tx) => {
      signalStarted();
      await held;
      const order = await OrderService.createOrderInTransaction(tx, input);
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });
  await started;
  controller.abort(new Error('injected-client-abort'));
  release();
  const completed = await attempt;
  const replay = await executeOrder(input);
  assert.equal(completed.resourceId, replay.resourceId);
  assert.equal(replay.replayed, true);
  assert.equal(await prisma.order.count({ where: { idempotencyKey: key } }), 1);
});
test('insufficient inventory and one-use voucher under different keys leave no losing side effects', async () => {
  const user = await createUser();
  const scarce = await createProduct(1);
  const insufficientKey = `insufficient:${suffix()}`;
  await assert.rejects(executeOrder(orderInput(user.id, scarce.id, insufficientKey)));
  assert.equal(await prisma.order.count({ where: { idempotencyKey: insufficientKey } }), 0);
  assert.equal(await prisma.idempotencyRecord.count({ where: { key: insufficientKey } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } })).stockQuantity, 1);

  const product = await createProduct(10);
  const voucher = await createVoucher(user.id, 1);
  const attempts = [1, 2].map((number) => executeOrder(orderInput(user.id, product.id, `voucher-race:${suffix()}`, { voucherCode: voucher.code }))
    .then((value) => ({ status: 'fulfilled' as const, value }))
    .catch((reason: unknown) => ({ status: 'rejected' as const, reason })));
  const results = await Promise.all(attempts);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } })).usedCount, 1);
  const reservedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.deepEqual({ stock: reservedProduct.stockQuantity, reserved: reservedProduct.reservedQuantity }, { stock: 10, reserved: 2 });
});

test('payment locking enforces one wallet charge, ownership/status guards, replay, conflict, and provider uniqueness', async () => {
  const [owner, stranger] = await Promise.all([createUser(), createUser()]);
  const product = await createProduct(50);
  const order = await createCodOrder(owner.id, product.id);
  const key = `payment:${suffix()}`;
  const run = () => IdempotencyService.execute({
    scopeId: owner.id, operation: `payment:create:${order.id}`, method: 'POST', key, request: { orderId: order.id },
    handler: async (tx) => {
      const payment = await PaymentService.create(tx, { orderId: order.id, userId: owner.id, idempotencyKey: key });
      return { status: 201, body: payment, resourceType: 'payment', resourceId: payment.id };
    },
  });
  const outcomes = await Promise.all(Array.from({ length: 4 }, run));
  assert.equal(new Set(outcomes.map((result) => result.resourceId)).size, 1);
  assert.equal(outcomes.filter((result) => result.replayed).length, 3);
  assert.equal(Money.serialize((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).balance), '980.0000');
  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
  await assert.rejects(prisma.$transaction((tx) => PaymentService.create(tx, { orderId: order.id, userId: stranger.id, idempotencyKey: 'foreign' })));

  const cancelled = await createCodOrder(owner.id, product.id);
  await InventoryService.cancel(cancelled.id, { type: 'CUSTOMER', userId: owner.id }, `cancel-fixture:${suffix()}`);
  await assert.rejects(prisma.$transaction((tx) => PaymentService.create(tx, { orderId: cancelled.id, userId: owner.id, idempotencyKey: 'cancelled' })));
  await assert.rejects(runPaymentConflict(owner.id, order.id, key, { orderId: `${order.id}:different` }));

  const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
  const anotherOrder = await createCodOrder(owner.id, product.id);
  await assert.rejects(prisma.payment.create({
    data: {
      orderId: anotherOrder.id, userId: owner.id, amount: anotherOrder.total, operation: `payment:create:${anotherOrder.id}`,
      idempotencyKey: `duplicate-provider:${suffix()}`, providerIdempotencyKey: `other:${suffix()}`,
      providerTransactionId: payment.providerTransactionId,
    },
  }), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002');
});


async function runPaymentConflict(userId: string, orderId: string, key: string, request: unknown) {
  return IdempotencyService.execute({
    scopeId: userId, operation: `payment:create:${orderId}`, method: 'POST', key, request,
    handler: async () => { throw new Error('must-not-run'); },
  });
}

test('refund row lock prevents over-refund and enforces replay, payload conflict, ownership, and partial refunds', async () => {
  const [owner, stranger] = await Promise.all([createUser(), createUser()]);
  const product = await createProduct(50);
  const order = await createCodOrder(owner.id, product.id);
  const paymentKey = `payment-for-refund:${suffix()}`;
  const payment = await prisma.$transaction((tx) => PaymentService.create(tx, { orderId: order.id, userId: owner.id, idempotencyKey: paymentKey }));
  const fullKey = `full-refund:${suffix()}`;
  const fullRun = () => IdempotencyService.execute({
    scopeId: owner.id, operation: `payment:refund:${payment.id}`, method: 'POST', key: fullKey,
    request: { paymentId: payment.id, amount: payment.amount },
    handler: async (tx) => {
      const refund = await RefundService.create(tx, { paymentId: payment.id, userId: owner.id, amount: payment.amount, currency: payment.currency, idempotencyKey: fullKey });
      return { status: 201, body: refund, resourceType: 'refund', resourceId: refund.id };
    },
  });
  const fullResults = await Promise.all(Array.from({ length: 4 }, fullRun));
  assert.equal(new Set(fullResults.map((result) => result.resourceId)).size, 1);
  assert.equal(await prisma.refund.count({ where: { paymentId: payment.id } }), 1);
  assert.equal(Money.serialize((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).balance), '1000.0000');
  await assert.rejects(prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: stranger.id, amount: new Prisma.Decimal('1'), currency: 'VND', idempotencyKey: 'foreign' })));
  await assert.rejects(IdempotencyService.execute({
    scopeId: owner.id, operation: `payment:refund:${payment.id}`, method: 'POST', key: fullKey,
    request: { paymentId: payment.id, amount: 1 }, handler: async () => { throw new Error('must-not-run'); },
  }), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'IDEMPOTENCY_KEY_REUSED');

  const partialOrder = await createCodOrder(owner.id, product.id);
  const partialPayment = await prisma.$transaction((tx) => PaymentService.create(tx, {
    orderId: partialOrder.id, userId: owner.id, idempotencyKey: `partial-payment:${suffix()}`,
  }));
  const partialAttempts = [12, 12].map((amount) => prisma.$transaction((tx) => RefundService.create(tx, {
    paymentId: partialPayment.id, userId: owner.id, amount: new Prisma.Decimal(amount), currency: 'VND', idempotencyKey: `partial:${suffix()}`,
  })).then((value) => ({ status: 'fulfilled' as const, value })).catch((reason: unknown) => ({ status: 'rejected' as const, reason })));
  const partialResults = await Promise.all(partialAttempts);
  assert.equal(partialResults.filter((result) => result.status === 'fulfilled').length, 1);
  const sum = await prisma.refund.aggregate({ where: { paymentId: partialPayment.id }, _sum: { amount: true } });
  assert.equal(Money.serialize(sum._sum.amount ?? '0'), '12.0000');
});


function signedWebhookRequest(body: unknown, timestamp = Math.floor(Date.now() / 1000), signatureOverride?: string) {
  const rawBody = JSON.stringify(body);
  const secret = process.env.WEBHOOK_SECRET as string;
  const signature = signatureOverride ?? createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST', body: rawBody,
    headers: { 'content-type': 'application/json', 'x-webhook-timestamp': String(timestamp), 'x-webhook-signature': signature },
  });
}

test('webhook verifies timestamp.rawBody, dedupes events, rolls back failures, and prevents state regression', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createCodOrder(user.id, product.id);
  const event = { provider: 'internal-test', eventId: `evt-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const invalid = await webhookPost(signedWebhookRequest({ ...event, eventId: `invalid-${suffix()}` }, undefined, '0'.repeat(64)));
  assert.equal(invalid.status, 401);
  assert.equal(await prisma.webhookEvent.count({ where: { providerEventId: { startsWith: 'invalid-' } } }), 0);

  const first = await webhookPost(signedWebhookRequest(event));
  const duplicate = await webhookPost(signedWebhookRequest(event));
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json() as { duplicate: boolean }).duplicate, true);
  assert.equal(await prisma.webhookEvent.count({ where: { provider: event.provider, providerEventId: event.eventId } }), 1);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'paid');

  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: { type: 'ADMIN', userId: user.id }, idempotencyKey: `fixture-confirm:${suffix()}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.PACKING, actor: { type: 'ADMIN', userId: user.id }, idempotencyKey: `fixture-pack:${suffix()}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: { type: 'ADMIN', userId: user.id }, metadata: { trackingNumber: 'WEBHOOK-REGRESSION' }, idempotencyKey: `fixture-ship:${suffix()}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: { type: 'ADMIN', userId: user.id }, idempotencyKey: `fixture-deliver:${suffix()}` });
  const later = { ...event, eventId: `evt-${suffix()}` };
  assert.equal((await webhookPost(signedWebhookRequest(later))).status, 200);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'delivered');

  const unknownOrder = { ...event, eventId: `evt-${suffix()}`, orderId: `missing-${suffix()}` };
  assert.equal((await webhookPost(signedWebhookRequest(unknownOrder))).status, 400);
  assert.equal(await prisma.webhookEvent.count({ where: { providerEventId: unknownOrder.eventId } }), 0);
  assert.equal((await webhookPost(signedWebhookRequest(event, Math.floor(Date.now() / 1000) - 301))).status, 401);
  const unknownType = { ...event, eventId: `evt-${suffix()}`, eventType: 'unknown.event' };
  assert.equal((await webhookPost(signedWebhookRequest(unknownType))).status, 400);
  assert.equal(await prisma.webhookEvent.count({ where: { providerEventId: unknownType.eventId } }), 0);
});

test('cleanup is bounded, dry-runnable, concurrent-safe, and preserves unexpired/PROCESSING records', async () => {
  const user = await createUser();
  const now = Date.now();
  const base = { scopeId: user.id, operation: 'cleanup:test', method: 'POST', requestHash: 'a'.repeat(64), responseStatus: 200, responseBody: '{}', completedAt: new Date() };
  await prisma.idempotencyRecord.createMany({ data: [
    { ...base, key: `expired-${suffix()}`, status: 'COMPLETED', expiresAt: new Date(now - 1_000) },
    { ...base, key: `fresh-${suffix()}`, status: 'COMPLETED', expiresAt: new Date(now + 60_000) },
    { ...base, key: `processing-${suffix()}`, status: 'PROCESSING', responseBody: null, completedAt: null, expiresAt: new Date(now - 1_000) },
  ] });
  assert.equal(await IdempotencyService.cleanup(1, prisma, true), 1);
  assert.equal(await prisma.idempotencyRecord.count({ where: { scopeId: user.id } }), 3);
  const deleted = await Promise.all([IdempotencyService.cleanup(1), IdempotencyService.cleanup(1)]);
  assert.equal(deleted.reduce((sum, count) => sum + count, 0), 1);
  assert.equal(await prisma.idempotencyRecord.count({ where: { scopeId: user.id, status: 'PROCESSING' } }), 1);
  assert.equal(await prisma.idempotencyRecord.count({ where: { scopeId: user.id, expiresAt: { gt: new Date(now) } } }), 1);

  const explain = await prisma.$queryRaw<Array<{ EXPLAIN: string }>>`
    EXPLAIN FORMAT=JSON SELECT id FROM idempotency_record FORCE INDEX (idempotency_record_status_expiresAt_idx)
    WHERE expiresAt < NOW() AND status = 'COMPLETED' ORDER BY expiresAt LIMIT 500`;
  const plan = String(Object.values(explain[0] ?? {})[0] ?? '');
  assert.match(plan, /idempotency_record_status_expiresAt_idx/);
});