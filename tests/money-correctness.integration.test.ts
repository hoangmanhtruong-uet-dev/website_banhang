import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../src/lib/db';
import { Money, parseMoneyInput, serializeMoneyFields } from '../src/lib/utils/money';
import { OrderService } from '../src/lib/services/order.service';
import { PaymentService, RefundService } from '../src/lib/services/payment.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Money integration tests require the dedicated MySQL 8 test database.');
const suffix = () => crypto.randomUUID();

async function clean() {
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  const [row] = await prisma.$queryRaw<Array<{ name: string; version: string }>>`SELECT DATABASE() name, VERSION() version`;
  assert.match(row?.name ?? '', /_test$/);
  assert.match(row?.version ?? '', /^8\./);
});
beforeEach(clean);
after(async () => { await clean(); await prisma.$disconnect(); });

test('decimal arithmetic is exact and negative zero is canonical', () => {
  assert.equal(Money.serialize(Money.add('0.1', '0.2')), '0.3000');
  assert.equal(Money.serialize(Money.sum(['0.1', '0.2', '0.3'])), '0.6000');
  assert.equal(Money.serialize('-0.00001'), '0.0000');
  assert.equal(Money.serialize(Money.multiply('10.1234', 3)), '30.3702');
});

test('ROUND_HALF_UP is explicit at persistence boundary', () => {
  assert.equal(Money.serialize(Money.round('1.00005')), '1.0001');
  assert.equal(Money.serialize(Money.round('-1.00005')), '-1.0001');
});

test('money input rejects float numbers, scientific notation, excess scale and range', () => {
  assert.throws(() => parseMoneyInput(0.1));
  assert.throws(() => parseMoneyInput('1e3'));
  assert.throws(() => parseMoneyInput('1.00001'));
  assert.throws(() => parseMoneyInput('1000000000000000.0000'));
  assert.equal(Money.serialize(parseMoneyInput('100.5000')), '100.5000');
});

test('server snapshots Decimal prices and ignores client totals', async () => {
  const id = suffix();
  const user = await prisma.user.create({ data: { code: `MU-${id.slice(0, 8)}`, name: 'Money User', email: `${id}@money.test`, password: 'x', balance: new Prisma.Decimal('1000.0000') } });
  const products = await Promise.all([
    prisma.product.create({ data: { code: `MP-A-${id.slice(0, 6)}`, slug: `mp-a-${id}`, name: 'A', price: new Prisma.Decimal('10.1234'), stockQuantity: 20 } }),
    prisma.product.create({ data: { code: `MP-B-${id.slice(0, 6)}`, slug: `mp-b-${id}`, name: 'B', price: new Prisma.Decimal('20.5678'), stockQuantity: 20 } }),
  ]);
  const order = await OrderService.createOrder({
    userId: user.id, customerName: 'Money User', customerEmail: user.email, customerPhone: '0900000000',
    shippingAddress: 'Integration test address', paymentMethod: 'COD', idempotencyKey: `order:${id}`,
    items: [{ productId: products[0].id, quantity: 3 }, { productId: products[1].id, quantity: 2 }],
  });
  assert.equal(Money.serialize(order.subtotal), '71.5058');
  assert.equal(Money.serialize(order.total), '71.5058');
  assert.deepEqual(order.orderItems.map((item) => Money.serialize(item.lineTotal)).sort(), ['30.3702', '41.1356'].sort());
  assert.equal(order.currency, 'VND');
});

test('two decimal partial refunds remain bounded and ledger balances reconcile', async () => {
  const id = suffix();
  const user = await prisma.user.create({ data: { code: `MR-${id.slice(0, 8)}`, name: 'Refund User', email: `${id}@refund.test`, password: 'x', balance: new Prisma.Decimal('1000.0000') } });
  const product = await prisma.product.create({ data: { code: `RP-${id.slice(0, 8)}`, slug: `rp-${id}`, name: 'Refundable', price: new Prisma.Decimal('10.3000'), stockQuantity: 10 } });
  const order = await OrderService.createOrder({
    userId: user.id, customerName: 'Refund User', customerEmail: user.email, customerPhone: '0900000000',
    shippingAddress: 'Integration test address', paymentMethod: 'COD', idempotencyKey: `order:${id}`,
    items: [{ productId: product.id, quantity: 1 }],
  });
  const payment = await prisma.$transaction((tx) => PaymentService.create(tx, { orderId: order.id, userId: user.id, idempotencyKey: `pay:${id}` }));
  await prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: user.id, amount: new Prisma.Decimal('0.1000'), currency: 'VND', idempotencyKey: `r1:${id}` }));
  await prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: user.id, amount: new Prisma.Decimal('0.2000'), currency: 'VND', idempotencyKey: `r2:${id}` }));
  const stored = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(Money.serialize(stored.refundedAmount), '0.3000');
  const ledgers = await prisma.walletLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
  for (const ledger of ledgers) assert.equal(Money.serialize(Money.add(ledger.balanceBefore, ledger.amount)), Money.serialize(ledger.balanceAfter));
  await assert.rejects(prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: user.id, amount: new Prisma.Decimal('10.0001'), currency: 'VND', idempotencyKey: `over:${id}` })));
  await assert.rejects(prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: user.id, amount: new Prisma.Decimal('0.1000'), currency: 'USD', idempotencyKey: `currency:${id}` })));
});

test('API money serializer emits fixed-scale strings', () => {
  assert.deepEqual(serializeMoneyFields({ amount: new Prisma.Decimal('125000'), currency: 'VND' }), { amount: '125000.0000', currency: 'VND' });
});

test('MySQL DECIMAL aggregate is exact', async () => {
  const id = suffix();
  const user = await prisma.user.create({ data: { code: `MA-${id.slice(0, 8)}`, name: 'Aggregate User', email: `${id}@aggregate.test`, password: 'x' } });
  await Promise.all(['0.1000', '0.2000', '0.3000'].map((price, index) => prisma.product.create({ data: {
    code: `AG-${index}-${id.slice(0, 6)}`, slug: `ag-${index}-${id}`, name: `Aggregate ${index}`, price: new Prisma.Decimal(price), sellerId: user.id,
  } })));
  const aggregate = await prisma.product.aggregate({ where: { sellerId: user.id }, _sum: { price: true } });
  assert.equal(Money.serialize(aggregate._sum.price ?? '0'), '0.6000');
});
