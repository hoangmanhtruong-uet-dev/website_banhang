import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../src/lib/db';
import { IdempotencyService } from '../src/lib/services/idempotency.service';
import { OrderService, type CreateOrderInput } from '../src/lib/services/order.service';
import { PaymentService } from '../src/lib/services/payment.service';
import { InventoryService } from '../src/lib/services/inventory.service';
import { ORDER_STATUS, OrderStateService } from '../src/lib/services/order-state.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Order state integration tests require the dedicated MySQL 8 test database.');
const id = () => crypto.randomUUID();

async function clean() {
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
  const [row] = await prisma.$queryRaw<Array<{ name: string; version: string }>>`SELECT DATABASE() name, VERSION() version`;
  assert.match(row.name, /_test$/);
  assert.match(row.version, /^8\./);
});
beforeEach(clean);
after(async () => { await clean(); await prisma.$disconnect(); });

async function users() {
  const token = id();
  const owner = await prisma.user.create({ data: { code: `OU-${token.slice(0, 7)}`, name: 'Owner', email: `${token}@owner.test`, password: 'x', balance: 1000 } });
  const admin = await prisma.user.create({ data: { code: `OA-${token.slice(0, 7)}`, name: 'Admin', email: `${token}@admin.test`, password: 'x', role: 'admin' } });
  const shipper = await prisma.user.create({ data: { code: `OS-${token.slice(0, 7)}`, name: 'Shipper', email: `${token}@shipper.test`, password: 'x', role: 'shipper' } });
  const stranger = await prisma.user.create({ data: { code: `OX-${token.slice(0, 7)}`, name: 'Other', email: `${token}@other.test`, password: 'x' } });
  return { owner, admin, shipper, stranger };
}

async function pendingOrder() {
  const actors = await users();
  const token = id();
  const product = await prisma.product.create({ data: { code: `OP-${token.slice(0, 7)}`, slug: `order-state-${token}`, name: 'State item', price: 25, stockQuantity: 10 } });
  const input: CreateOrderInput = { userId: actors.owner.id, idempotencyKey: `checkout:${token}`, customerName: 'Owner', customerEmail: actors.owner.email, customerPhone: '0900000000', shippingAddress: 'Test', paymentMethod: 'COD', items: [{ productId: product.id, quantity: 1 }] };
  const result = await IdempotencyService.execute({ scopeId: actors.owner.id, operation: 'order:create', method: 'POST', key: input.idempotencyKey, request: input, handler: async (tx) => ({ status: 201, body: await OrderService.createOrderInTransaction(tx, input) }) });
  return { ...actors, product, order: result.body };
}

async function paidOrder() {
  const fixture = await pendingOrder();
  await prisma.$transaction((tx) => PaymentService.create(tx, { orderId: fixture.order.id, userId: fixture.owner.id, idempotencyKey: `pay:${id()}` }));
  return { ...fixture, order: await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } }) };
}

const adminActor = (userId: string) => ({ type: 'ADMIN' as const, userId });

test('payment flow is the trusted pending -> paid transition and writes timestamp/history/outbox atomically', async () => {
  const fixture = await paidOrder();
  assert.equal(fixture.order.status, ORDER_STATUS.PAID);
  assert.equal(fixture.order.paymentStatus, 'paid');
  assert.ok(fixture.order.paidAt);
  const history = await prisma.orderStatusTransition.findMany({ where: { orderId: fixture.order.id } });
  assert.equal(history.length, 1);
  assert.deepEqual([history[0].fromStatus, history[0].toStatus, history[0].actorType], ['pending', 'paid', 'SYSTEM']);
  assert.equal(await prisma.outboxEvent.count({ where: { orderId: fixture.order.id, eventType: 'ORDER_PAID' } }), 1);
});

test('admin cannot forge payment and backward/terminal transitions are rejected', async () => {
  const fixture = await pendingOrder();
  await assert.rejects(OrderStateService.transition({ orderId: fixture.order.id, targetStatus: ORDER_STATUS.PAID, actor: adminActor(fixture.admin.id), idempotencyKey: `admin-paid:${id()}` }), (error: unknown) => (error as { code?: string }).code === 'ACTOR_NOT_ALLOWED');
  const paid = await prisma.$transaction((tx) => PaymentService.create(tx, { orderId: fixture.order.id, userId: fixture.owner.id, idempotencyKey: `pay:${id()}` }));
  assert.ok(paid);
  await assert.rejects(OrderStateService.transition({ orderId: fixture.order.id, targetStatus: ORDER_STATUS.PENDING_PAYMENT, actor: adminActor(fixture.admin.id), idempotencyKey: `back:${id()}` }), (error: unknown) => (error as { code?: string }).code === 'INVALID_ORDER_TRANSITION');
  assert.equal(await prisma.orderStatusTransition.count({ where: { orderId: fixture.order.id } }), 1);
});

test('paid -> confirmed -> packing -> shipping -> delivered enforces roles, assignment and timestamps', async () => {
  const f = await paidOrder();
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(f.admin.id), idempotencyKey: `confirm:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(f.admin.id), idempotencyKey: `pack:${id()}` });
  await assert.rejects(OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: { type: 'SHIPPER', userId: f.shipper.id }, idempotencyKey: `skip:${id()}` }));
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: { type: 'SHIPPER', userId: f.shipper.id }, metadata: { assignSelf: true, trackingNumber: 'TRACK-1' }, idempotencyKey: `ship:${id()}` });
  const delivered = await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: { type: 'SHIPPER', userId: f.shipper.id }, idempotencyKey: `deliver:${id()}` });
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.shipperId, f.shipper.id);
  assert.ok(delivered.confirmedAt && delivered.packingStartedAt && delivered.shippedAt && delivered.deliveredAt);
  assert.equal(await prisma.orderStatusTransition.count({ where: { orderId: f.order.id } }), 5);
});

test('same idempotency key replays exactly; changed target conflicts and self-transition with another key conflicts', async () => {
  const f = await paidOrder();
  const key = `confirm:${id()}`;
  const input = { orderId: f.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(f.admin.id), idempotencyKey: key };
  await OrderStateService.transition(input);
  await OrderStateService.transition(input);
  assert.equal(await prisma.orderStatusTransition.count({ where: { orderId: f.order.id, toStatus: 'confirmed' } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { orderId: f.order.id, eventType: 'ORDER_CONFIRMED' } }), 1);
  await assert.rejects(OrderStateService.transition({ ...input, targetStatus: ORDER_STATUS.PACKING }), (error: unknown) => (error as { code?: string }).code === 'IDEMPOTENCY_CONFLICT');
  await assert.rejects(OrderStateService.transition({ ...input, idempotencyKey: `self:${id()}` }), (error: unknown) => (error as { code?: string }).code === 'ORDER_STATUS_CONFLICT');
});

test('customer only cancels own pending order; reservation release and duplicate cancellation are safe', async () => {
  const f = await pendingOrder();
  await assert.rejects(InventoryService.cancel(f.order.id, { type: 'CUSTOMER', userId: f.stranger.id }, `bad-cancel:${id()}`), (error: unknown) => (error as { code?: string }).code === 'ACTOR_NOT_ALLOWED');
  const key = `cancel:${id()}`;
  await InventoryService.cancel(f.order.id, { type: 'CUSTOMER', userId: f.owner.id }, key);
  await InventoryService.cancel(f.order.id, { type: 'CUSTOMER', userId: f.owner.id }, key);
  const [order, reservation] = await Promise.all([prisma.order.findUniqueOrThrow({ where: { id: f.order.id } }), prisma.inventoryReservation.findFirstOrThrow({ where: { orderId: f.order.id } })]);
  assert.equal(order.status, 'cancelled');
  assert.ok(order.cancelledAt);
  assert.equal(reservation.status, 'RELEASED');
  assert.equal(await prisma.orderStatusTransition.count({ where: { orderId: f.order.id } }), 1);
});

test('paid/shipping/delivered orders cannot bypass compensation with cancellation', async () => {
  const f = await paidOrder();
  await assert.rejects(InventoryService.cancel(f.order.id, adminActor(f.admin.id), `paid-cancel:${id()}`));
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, 'paid');
});

test('return requires delivery, ownership, reason and window; approve/return/refund path is forward-only', async () => {
  const f = await paidOrder();
  await assert.rejects(OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: f.owner.id }, reason: 'too early', idempotencyKey: `return-early:${id()}` }));
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(f.admin.id), idempotencyKey: `c:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(f.admin.id), idempotencyKey: `p:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: adminActor(f.admin.id), metadata: { trackingNumber: 'RET-1' }, idempotencyKey: `s:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: adminActor(f.admin.id), idempotencyKey: `d:${id()}` });
  const key = `return:${id()}`;
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: f.owner.id }, reason: 'Damaged item', idempotencyKey: key });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURN_APPROVED, actor: adminActor(f.admin.id), idempotencyKey: `approve:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURNING, actor: adminActor(f.admin.id), idempotencyKey: `returning:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURNED, actor: adminActor(f.admin.id), idempotencyKey: `returned:${id()}` });
  const record = await prisma.orderReturn.findFirstOrThrow({ where: { orderId: f.order.id } });
  assert.equal(record.status, 'COMPLETED');
  assert.ok(record.completedAt);
});

test('confirm versus refund and packing versus refund races serialize without stale overwrite', async () => {
  const first = await paidOrder();
  const race1 = await Promise.allSettled([
    OrderStateService.transition({ orderId: first.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(first.admin.id), idempotencyKey: `race-confirm:${id()}` }),
    OrderStateService.transition({ orderId: first.order.id, targetStatus: ORDER_STATUS.REFUND_PENDING, actor: { type: 'SYSTEM', workerId: 'race-refund' }, idempotencyKey: `race-refund:${id()}` }),
  ]);
  assert.equal(race1.filter((result) => result.status === 'fulfilled').length, 1);
  assert.ok(['confirmed', 'refund_pending'].includes((await prisma.order.findUniqueOrThrow({ where: { id: first.order.id } })).status));

  const second = await paidOrder();
  await OrderStateService.transition({ orderId: second.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(second.admin.id), idempotencyKey: `race-base:${id()}` });
  const race2 = await Promise.allSettled([
    OrderStateService.transition({ orderId: second.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(second.admin.id), idempotencyKey: `race-pack:${id()}` }),
    OrderStateService.transition({ orderId: second.order.id, targetStatus: ORDER_STATUS.REFUND_PENDING, actor: { type: 'SYSTEM', workerId: 'race-refund' }, idempotencyKey: `race-refund:${id()}` }),
  ]);
  assert.equal(race2.filter((result) => result.status === 'fulfilled').length, 1);
  assert.ok(['packing', 'refund_pending'].includes((await prisma.order.findUniqueOrThrow({ where: { id: second.order.id } })).status));
});


test('return outside configured window is rejected without history or return record', async () => {
  const f = await paidOrder();
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(f.admin.id), idempotencyKey: `window-c:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(f.admin.id), idempotencyKey: `window-p:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: adminActor(f.admin.id), metadata: { trackingNumber: 'WINDOW-1' }, idempotencyKey: `window-s:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: adminActor(f.admin.id), idempotencyKey: `window-d:${id()}` });
  await prisma.order.update({ where: { id: f.order.id }, data: { deliveredAt: new Date(Date.now() - 31 * 86_400_000) } });
  const before = await prisma.orderStatusTransition.count({ where: { orderId: f.order.id } });
  await assert.rejects(OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: f.owner.id }, reason: 'Too late', idempotencyKey: `window-r:${id()}` }), (error: unknown) => (error as { code?: string }).code === 'RETURN_WINDOW_EXPIRED');
  assert.equal(await prisma.orderStatusTransition.count({ where: { orderId: f.order.id } }), before);
  assert.equal(await prisma.orderReturn.count({ where: { orderId: f.order.id } }), 0);
});

test('deliver versus return request race serializes to delivered or return_requested only', async () => {
  const f = await paidOrder();
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(f.admin.id), idempotencyKey: `dr-c:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(f.admin.id), idempotencyKey: `dr-p:${id()}` });
  await OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: adminActor(f.admin.id), metadata: { trackingNumber: 'DR-1' }, idempotencyKey: `dr-s:${id()}` });
  const results = await Promise.allSettled([
    OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.DELIVERED, actor: adminActor(f.admin.id), idempotencyKey: `dr-d:${id()}` }),
    OrderStateService.transition({ orderId: f.order.id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: f.owner.id }, reason: 'Race request', idempotencyKey: `dr-r:${id()}` }),
  ]);
  assert.ok(results.some((result) => result.status === 'fulfilled'));
  assert.ok(['delivered', 'return_requested'].includes((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status));
});
test('shipping versus cancellation and refund completion versus fulfillment races remain forward-only', async () => {
  const shipping = await paidOrder();
  await OrderStateService.transition({ orderId: shipping.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(shipping.admin.id), idempotencyKey: `sc-c:${id()}` });
  await OrderStateService.transition({ orderId: shipping.order.id, targetStatus: ORDER_STATUS.PACKING, actor: adminActor(shipping.admin.id), idempotencyKey: `sc-p:${id()}` });
  const shipCancelRace = await Promise.allSettled([
    OrderStateService.transition({ orderId: shipping.order.id, targetStatus: ORDER_STATUS.SHIPPING, actor: adminActor(shipping.admin.id), metadata: { trackingNumber: 'SC-1' }, idempotencyKey: `sc-s:${id()}` }),
    InventoryService.cancel(shipping.order.id, adminActor(shipping.admin.id), `sc-x:${id()}`),
  ]);
  assert.equal(shipCancelRace.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: shipping.order.id } })).status, 'shipping');

  const refund = await paidOrder();
  await OrderStateService.transition({ orderId: refund.order.id, targetStatus: ORDER_STATUS.REFUND_PENDING, actor: { type: 'SYSTEM', workerId: 'race-refund' }, idempotencyKey: `rf-pending:${id()}` });
  await prisma.payment.updateMany({
    where: { orderId: refund.order.id },
    data: { status: 'REFUNDED', refundedAmount: refund.order.total },
  });
  const refundFulfillmentRace = await Promise.allSettled([
    OrderStateService.transition({ orderId: refund.order.id, targetStatus: ORDER_STATUS.REFUNDED, actor: { type: 'SYSTEM', workerId: 'race-refund' }, idempotencyKey: `rf-done:${id()}` }),
    OrderStateService.transition({ orderId: refund.order.id, targetStatus: ORDER_STATUS.CONFIRMED, actor: adminActor(refund.admin.id), idempotencyKey: `rf-confirm:${id()}` }),
  ]);
  assert.equal(refundFulfillmentRace.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: refund.order.id } })).status, 'refunded');
});
test('migration creates transition/return FK and bounded indexes', async () => {
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`SELECT TABLE_NAME name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('order_status_transition','order_return')`;
  assert.equal(tables.length, 2);
  const constraints = await prisma.$queryRaw<Array<{ name: string }>>`SELECT CONSTRAINT_NAME name FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('order_status_transition','order_return')`;
  assert.ok(constraints.some((row) => row.name === 'order_transition_order_fk'));
  assert.ok(constraints.some((row) => row.name === 'order_return_order_fk'));
  assert.ok(constraints.every((row) => row.name.length <= 64));
});