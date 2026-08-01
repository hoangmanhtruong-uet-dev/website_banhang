import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryReservationStatus } from '@prisma/client';
import prisma from '../src/lib/db';
import { IdempotencyService } from '../src/lib/services/idempotency.service';
import { inventoryConfig, InventoryExpiryWorker, InventoryReconciliationService, InventoryService } from '../src/lib/services/inventory.service';
import { OrderService, type CreateOrderInput } from '../src/lib/services/order.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Inventory integration tests require the dedicated MySQL 8 test database.');
}

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
  await prisma.voucher.deleteMany();
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

async function user() {
  const token = suffix();
  return prisma.user.create({ data: { code: `IU-${token.slice(0, 8)}`, name: 'Inventory User', email: `${token}@inventory.test`, password: 'unused', balance: 1000 } });
}

async function product(stockQuantity: number, name = 'Inventory Product') {
  const token = suffix();
  return prisma.product.create({ data: { code: `IP-${token.slice(0, 8)}`, slug: `inventory-${token}`, name, price: 10, stockQuantity } });
}

function input(userId: string, items: Array<{ productId: string; quantity: number }>, key = `inventory:${suffix()}`): CreateOrderInput {
  return {
    userId, idempotencyKey: key, customerName: 'Inventory Test', customerEmail: 'inventory@example.test',
    customerPhone: '0900000000', shippingAddress: 'MySQL integration test address', paymentMethod: 'COD', items,
  };
}

async function checkout(value: CreateOrderInput) {
  return IdempotencyService.execute({
    scopeId: value.userId, operation: 'order:create', method: 'POST', key: value.idempotencyKey, request: value,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, value);
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });
}

async function state(productId: string) {
  const value = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return { stock: value.stockQuantity, reserved: value.reservedQuantity };
}

async function codOrder(quantity = 1, stock = 5) {
  const [owner, item] = await Promise.all([user(), product(stock)]);
  const order = (await checkout(input(owner.id, [{ productId: item.id, quantity }]))).body;
  return { owner, item, order };
}

async function succeededPayment(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!order.userId) throw new Error('Test order must have an owner');
  const token = suffix();
  return prisma.payment.create({ data: {
    orderId, userId: order.userId, amount: order.total, status: 'SUCCEEDED', operation: `test-payment:${orderId}`,
    idempotencyKey: `test-pay:${token}`, provider: 'integration-test', providerOutcome: 'SUCCEEDED', currency: order.currency,
    providerIdempotencyKey: `test-provider:${token}`, providerTransactionId: `test-txn:${token}`,
  } });
}
test('migration exposes reservation schema, bounded names, constraints, FKs, and indexed expiry plan', async () => {
  const columns = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'reservedQuantity'`;
  assert.equal(columns.length, 1);
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('inventory_reservation', 'outbox_event')`;
  assert.deepEqual(new Set(tables.map((entry) => entry.name)), new Set(['inventory_reservation', 'outbox_event']));
  const constraints = await prisma.$queryRaw<Array<{ name: string; type: string }>>`
    SELECT CONSTRAINT_NAME AS name, CONSTRAINT_TYPE AS type FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('product', 'inventory_reservation')`;
  assert.ok(constraints.some((entry) => entry.name === 'product_reserved_lte_stock_chk' && entry.type === 'CHECK'));
  assert.ok(constraints.some((entry) => entry.name === 'inv_res_orderitem_fk' && entry.type === 'FOREIGN KEY'));
  assert.ok(constraints.every((entry) => entry.name.length <= 64));
  const explain = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    EXPLAIN FORMAT=JSON SELECT id FROM inventory_reservation FORCE INDEX (inv_res_status_expires_idx)
    WHERE status = 'ACTIVE' AND expiresAt <= NOW() ORDER BY expiresAt LIMIT 100`;
  assert.match(JSON.stringify(explain), /inv_res_status_expires_idx/);
});

test('reserve succeeds without reducing physical stock and rejects insufficient availability atomically', async () => {
  const owner = await user();
  const item = await product(3);
  const first = await checkout(input(owner.id, [{ productId: item.id, quantity: 2 }]));
  assert.equal(first.replayed, false);
  assert.deepEqual(await state(item.id), { stock: 3, reserved: 2 });
  assert.equal(await prisma.inventoryReservation.count({ where: { orderId: first.resourceId, status: InventoryReservationStatus.ACTIVE } }), 1);
  await assert.rejects(checkout(input(owner.id, [{ productId: item.id, quantity: 2 }])));
  assert.deepEqual(await state(item.id), { stock: 3, reserved: 2 });
  assert.equal(await prisma.order.count({ where: { userId: owner.id } }), 1);
});

test('two concurrent checkouts for the last unit produce one reservation and never oversell', async () => {
  const [left, right, item] = await Promise.all([user(), user(), product(1)]);
  const results = await Promise.allSettled([
    checkout(input(left.id, [{ productId: item.id, quantity: 1 }])),
    checkout(input(right.id, [{ productId: item.id, quantity: 1 }])),
  ]);
  assert.equal(results.filter((entry) => entry.status === 'fulfilled').length, 1);
  assert.equal(results.filter((entry) => entry.status === 'rejected').length, 1);
  assert.deepEqual(await state(item.id), { stock: 1, reserved: 1 });
  assert.equal(await prisma.inventoryReservation.count({ where: { status: InventoryReservationStatus.ACTIVE } }), 1);
});

test('multi-SKU checkout rolls back order and every reservation when one SKU is unavailable', async () => {
  const owner = await user();
  const [enough, empty] = await Promise.all([product(3, 'Enough'), product(0, 'Empty')]);
  await assert.rejects(checkout(input(owner.id, [
    { productId: enough.id, quantity: 2 }, { productId: empty.id, quantity: 1 },
  ])));
  assert.equal(await prisma.order.count(), 0);
  assert.equal(await prisma.inventoryReservation.count(), 0);
  assert.deepEqual(await state(enough.id), { stock: 3, reserved: 0 });
  assert.deepEqual(await state(empty.id), { stock: 0, reserved: 0 });
});

test('same idempotency key replays one order/reservation and changed payload conflicts', async () => {
  const owner = await user();
  const item = await product(5);
  const key = `stable:${suffix()}`;
  const value = input(owner.id, [{ productId: item.id, quantity: 1 }], key);
  const [first, replay] = await Promise.all([checkout(value), checkout(value)]);
  assert.equal(first.resourceId, replay.resourceId);
  assert.equal(await prisma.order.count(), 1);
  assert.equal(await prisma.inventoryReservation.count(), 1);
  assert.deepEqual(await state(item.id), { stock: 5, reserved: 1 });
  await assert.rejects(checkout({ ...value, items: [{ productId: item.id, quantity: 2 }] }),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'IDEMPOTENCY_KEY_REUSED');
});

test('payment consumes once; duplicate payment transition cannot decrement twice', async () => {
  const { item, order } = await codOrder(2, 5);
  const payment = await succeededPayment(order.id);
  const results = await Promise.all([
    prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id)),
    prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id)),
  ]);
  assert.deepEqual(new Set(results), new Set(['consumed', 'duplicate']));
  assert.deepEqual(await state(item.id), { stock: 3, reserved: 0 });
  assert.equal(await prisma.inventoryReservation.count({ where: { orderId: order.id, status: InventoryReservationStatus.CONSUMED } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'INVENTORY_CONSUMED', orderId: order.id } }), 1);
});

test('expiry sweep survives restart semantics and duplicate workers release only once', async () => {
  const { item, order } = await codOrder(2, 5);
  await prisma.inventoryReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const counts = await Promise.all([InventoryExpiryWorker.runBatch(), InventoryExpiryWorker.runBatch()]);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 1);
  assert.deepEqual(await state(item.id), { stock: 5, reserved: 0 });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'expired');
  assert.equal(await InventoryExpiryWorker.runBatch(), 0);
});

test('payment versus expiry permits exactly one ACTIVE transition', async () => {
  const { item, order } = await codOrder(1, 1);
  const payment = await succeededPayment(order.id);
  await prisma.inventoryReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await Promise.all([
    prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id)),
    InventoryExpiryWorker.runBatch(),
  ]);
  const reservation = await prisma.inventoryReservation.findFirstOrThrow({ where: { orderId: order.id } });
  assert.ok(new Set<InventoryReservationStatus>([InventoryReservationStatus.CONSUMED, InventoryReservationStatus.EXPIRED]).has(reservation.status));
  const finalState = await state(item.id);
  assert.ok(
    (reservation.status === InventoryReservationStatus.CONSUMED && finalState.stock === 0 && finalState.reserved === 0)
    || (reservation.status === InventoryReservationStatus.EXPIRED && finalState.stock === 1 && finalState.reserved === 0),
  );
});

test('payment versus cancel handles the reservation once and cancel is retry-safe', async () => {
  const { item, order } = await codOrder(1, 2);
  const payment = await succeededPayment(order.id);
  const race = await Promise.allSettled([
    prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id)),
    InventoryService.cancel(order.id),
  ]);
  assert.ok(race.some((result) => result.status === 'fulfilled'));
  const reservation = await prisma.inventoryReservation.findFirstOrThrow({ where: { orderId: order.id } });
  assert.ok(new Set<InventoryReservationStatus>([InventoryReservationStatus.CONSUMED, InventoryReservationStatus.RELEASED]).has(reservation.status));
  const racedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (racedOrder.status === 'cancelled') await InventoryService.cancel(order.id);
  else await assert.rejects(InventoryService.cancel(order.id));
  const finalState = await state(item.id);
  assert.equal(finalState.reserved, 0);
  assert.ok(finalState.stock === 1 || finalState.stock === 2);
});

test('payment after expiry is recorded as late review and does not consume stock', async () => {
  const { item, order } = await codOrder(1, 2);
  await prisma.inventoryReservation.updateMany({ where: { orderId: order.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await InventoryExpiryWorker.runBatch();
  const payment = await succeededPayment(order.id);
  const outcome = await prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id));
  assert.equal(outcome, 'late');
  assert.deepEqual(await state(item.id), { stock: 2, reserved: 0 });
  const reviewed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.deepEqual({ status: reviewed.status, payment: reviewed.paymentStatus }, { status: 'payment_review', payment: 'paid_late' });
  assert.equal(await prisma.outboxEvent.count({ where: { orderId: order.id, eventType: 'LATE_PAYMENT_REVIEW_REQUIRED' } }), 1);
});

test('pending-order abuse limit blocks the fourth active reservation', async () => {
  const owner = await user();
  const item = await product(10);
  for (let index = 0; index < 3; index += 1) {
    await checkout(input(owner.id, [{ productId: item.id, quantity: 1 }]));
  }
  await assert.rejects(checkout(input(owner.id, [{ productId: item.id, quantity: 1 }])),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'PENDING_ORDER_LIMIT');
  assert.equal(await prisma.order.count({ where: { userId: owner.id } }), 3);
  assert.deepEqual(await state(item.id), { stock: 10, reserved: 3 });
});

test('database-backed checkout rate window survives cancellation churn', async () => {
  const owner = await user();
  const item = await product(inventoryConfig.maxOrdersPerWindow + 1);
  for (let index = 0; index < inventoryConfig.maxOrdersPerWindow; index += 1) {
    const order = await checkout(input(owner.id, [{ productId: item.id, quantity: 1 }]));
    await InventoryService.cancel(order.body.id);
  }
  await assert.rejects(checkout(input(owner.id, [{ productId: item.id, quantity: 1 }])),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'ORDER_RATE_LIMIT');
  assert.equal(await prisma.order.count({ where: { userId: owner.id } }), inventoryConfig.maxOrdersPerWindow);
  assert.deepEqual(await state(item.id), { stock: inventoryConfig.maxOrdersPerWindow + 1, reserved: 0 });
});

test('reconciliation detects mismatch, dry-run preserves it, and safe repair restores the active sum', async () => {
  const { item } = await codOrder(2, 5);
  await prisma.product.update({ where: { id: item.id }, data: { reservedQuantity: 0 } });
  const detected = await InventoryReconciliationService.run();
  assert.deepEqual(detected.map((entry) => ({ id: entry.productId, stored: entry.stored, expected: entry.expected })), [
    { id: item.id, stored: 0, expected: 2 },
  ]);
  assert.equal((await state(item.id)).reserved, 0);
  await InventoryReconciliationService.run({ repair: true });
  assert.deepEqual(await state(item.id), { stock: 5, reserved: 2 });
});

test('all persisted inventory values satisfy non-negative and reserved <= stock invariants', async () => {
  const { item, order } = await codOrder(2, 2);
  const payment = await succeededPayment(order.id);
  await prisma.$transaction((tx) => InventoryService.consumeForPayment(tx, order.id, payment.id));
  const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM product WHERE stockQuantity < 0 OR reservedQuantity < 0 OR reservedQuantity > stockQuantity`;
  assert.equal(Number(invalid[0]?.count ?? 0), 0);
  assert.deepEqual(await state(item.id), { stock: 0, reserved: 0 });
});
