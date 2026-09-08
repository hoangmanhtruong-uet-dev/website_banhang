import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { OrderService } from '@/lib/services/order/order.service';
import { RefundService } from '@/lib/services/payment/payment.service';
import { Money } from '@/lib/utils/money';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Business concurrency integration tests require the dedicated MySQL 8 test database.');

const suffix = () => crypto.randomUUID().replace(/-/g, '').slice(0, 18);

async function clean(): Promise<void> {
  await prisma.domainAuditLog.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.sellerFulfillmentTransition.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.sellerSettlement.deleteMany();
  await prisma.sellerFulfillment.deleteMany();
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

async function user(role = 'user', extra: Record<string, unknown> = {}) {
  const id = suffix();
  return prisma.user.create({ data: { code: `U-${id}`, name: `User ${id}`, email: `${id}@test.local`, password: 'unused', role, ...extra } });
}

async function category() {
  const id = suffix();
  return prisma.category.create({ data: { name: `Category ${id}`, slug: `category-${id}` } });
}

async function product(sellerId: string, price = '100.0000') {
  const id = suffix();
  const cat = await category();
  return prisma.product.create({ data: { code: `P-${id}`, sku: `SKU-${id}`, slug: `product-${id}`, name: `Product ${id}`, description: 'Integration product', price, currency: 'VND', categoryId: cat.id, sellerId, stockQuantity: 100, inStock: true } });
}

async function checkout(userId: string, productId: string, voucherCode: string, key: string, hooks?: Parameters<typeof OrderService.createOrderInTransaction>[2]) {
  return prisma.$transaction(tx => OrderService.createOrderInTransaction(tx, {
    userId, customerName: 'Buyer', customerEmail: `${userId}@buyer.test`, customerPhone: '0900000000', shippingAddress: '123 Test Street',
    paymentMethod: 'COD', voucherCode, idempotencyKey: key, items: [{ productId, quantity: 1 }],
  }, hooks), { maxWait: 10_000, timeout: 20_000 });
}


test('voucher redemptions never exceed usageLimit under N+1 concurrent COD checkouts', async () => {
  const buyer = await user();
  const seller = await user('user', { isSeller: true });
  const item = await product(seller.id);
  const voucher = await prisma.voucher.create({ data: { code: `V-${suffix()}`, sellerId: seller.id, discountType: 'fixed', discountValue: '10.0000', minOrderValue: '0.0000', usageLimit: 2, usedCount: 0, startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86_400_000), currency: 'VND' } });

  const results = await Promise.allSettled(Array.from({ length: 3 }, (_, index) => checkout(buyer.id, item.id, voucher.code, `voucher-race-${index}-${suffix()}`)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
  assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } })).usedCount, 2);
});

test('expired, seller scope, minimum order and invalid seller scope are rejected safely', async () => {
  const buyer = await user();
  const sellerA = await user('user', { isSeller: true });
  const sellerB = await user('user', { isSeller: true });
  const itemA = await product(sellerA.id, '50.0000');
  const itemB = await product(sellerB.id, '100.0000');
  const expired = await prisma.voucher.create({ data: { code: `VX-${suffix()}`, sellerId: sellerA.id, discountType: 'fixed', discountValue: '1.0000', minOrderValue: '0.0000', usageLimit: 1, startDate: new Date(Date.now() - 2000), endDate: new Date(Date.now() - 1000), currency: 'VND' } });
  await assert.rejects(checkout(buyer.id, itemA.id, expired.code, `expired-${suffix()}`));

  const min = await prisma.voucher.create({ data: { code: `VM-${suffix()}`, sellerId: sellerA.id, discountType: 'fixed', discountValue: '1.0000', minOrderValue: '60.0000', usageLimit: 1, startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86_400_000), currency: 'VND' } });
  await assert.rejects(checkout(buyer.id, itemA.id, min.code, `min-${suffix()}`));

  const scoped = await prisma.voucher.create({ data: { code: `VS-${suffix()}`, sellerId: sellerA.id, discountType: 'fixed', discountValue: '1.0000', minOrderValue: '0.0000', usageLimit: 1, startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86_400_000), currency: 'VND' } });
  await assert.rejects(checkout(buyer.id, itemB.id, scoped.code, `scope-${suffix()}`));
});


test('voucher usage increment rolls back when downstream order transaction fails', async () => {
  const buyer = await user();
  const seller = await user('user', { isSeller: true });
  const item = await product(seller.id);
  const voucher = await prisma.voucher.create({ data: { code: `VR-${suffix()}`, sellerId: seller.id, discountType: 'fixed', discountValue: '10.0000', minOrderValue: '0.0000', usageLimit: 1, startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86_400_000), currency: 'VND' } });
  await assert.rejects(checkout(buyer.id, item.id, voucher.code, `rollback-${suffix()}`, { afterOrderCreation: () => { throw new Error('forced downstream failure'); } }));
  assert.equal((await prisma.voucher.findUniqueOrThrow({ where: { id: voucher.id } })).usedCount, 0);
});

test('refunds cannot exceed payment amount under concurrent partial refund attempts', async () => {
  const buyer = await user('user', { balance: new Prisma.Decimal('0.0000') });
  const order = await prisma.order.create({ data: { customerName: buyer.name, customerEmail: buyer.email, customerPhone: '0900000000', shippingAddress: 'test', paymentMethod: 'bank_transfer', paymentStatus: 'paid', total: '100.0000', subtotal: '100.0000', currency: 'VND', status: 'delivered', userId: buyer.id, deliveredAt: new Date() } });
  const payment = await prisma.payment.create({ data: { orderId: order.id, userId: buyer.id, amount: '100.0000', status: 'SUCCEEDED', operation: `payment:create:${order.id}`, idempotencyKey: `pay-${suffix()}`, providerIdempotencyKey: `provider-${suffix()}`, providerTransactionId: `txn-${suffix()}`, currency: 'VND' } });

  const results = await Promise.allSettled(Array.from({ length: 3 }, (_, index) => prisma.$transaction(tx => RefundService.create(tx, { paymentId: payment.id, userId: buyer.id, amount: new Prisma.Decimal('60.0000'), currency: 'VND', idempotencyKey: `refund-${index}-${suffix()}` }), { maxWait: 10_000, timeout: 20_000 })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const updated = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.ok(Money.compare(updated.refundedAmount, updated.amount) <= 0);
});
