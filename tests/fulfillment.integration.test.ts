import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/lib/db';
import { OrderService } from '../src/lib/services/order.service';
import { FulfillmentService } from '../src/lib/services/fulfillment.service';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Fulfillment integration tests require the dedicated MySQL 8 test database.');
const id = () => crypto.randomUUID();

async function clean() {
  await prisma.notificationDelivery.deleteMany();
  await prisma.processedOutboxEvent.deleteMany();
  await prisma.domainAuditLog.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.sellerFulfillmentTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.sellerFulfillment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
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

test('multi-seller COD order has isolated voucher, inventory, seller actions and shipper assignments', async () => {
  const token = id();
  const customer = await prisma.user.create({ data: { code: `CU-${token.slice(0, 7)}`, name: 'Customer', email: `${token}@customer.test`, password: 'x' } });
  const sellerA = await prisma.user.create({ data: { code: `SA-${token.slice(0, 7)}`, name: 'Seller A', email: `${token}@seller-a.test`, password: 'x', isSeller: true } });
  const sellerB = await prisma.user.create({ data: { code: `SB-${token.slice(0, 7)}`, name: 'Seller B', email: `${token}@seller-b.test`, password: 'x', isSeller: true } });
  const shipperA = await prisma.user.create({ data: { code: `XA-${token.slice(0, 7)}`, name: 'Shipper A', email: `${token}@shipper-a.test`, password: 'x', role: 'shipper' } });
  const shipperB = await prisma.user.create({ data: { code: `XB-${token.slice(0, 7)}`, name: 'Shipper B', email: `${token}@shipper-b.test`, password: 'x', role: 'shipper' } });
  const productA = await prisma.product.create({ data: { code: `PA-${token.slice(0, 7)}`, slug: `seller-a-${token}`, name: 'A', price: 100, stockQuantity: 10, sellerId: sellerA.id } });
  const productB = await prisma.product.create({ data: { code: `PB-${token.slice(0, 7)}`, slug: `seller-b-${token}`, name: 'B', price: 200, stockQuantity: 10, sellerId: sellerB.id } });
  await prisma.voucher.create({ data: { code: `VA-${token.slice(0, 7)}`, discountType: 'percentage', discountValue: 10, minOrderValue: 50, endDate: new Date(Date.now() + 86_400_000), sellerId: sellerA.id } });

  const order = await OrderService.createOrder({
    userId: customer.id, customerName: customer.name, customerEmail: customer.email,
    customerPhone: '0900000000', shippingAddress: 'Hồ Chí Minh', paymentMethod: 'COD',
    voucherCode: `VA-${token.slice(0, 7)}`, idempotencyKey: `checkout:${token}`,
    items: [{ productId: productA.id, quantity: 1 }, { productId: productB.id, quantity: 1 }],
  });
  assert.equal(order.total.toString(), '290');
  const fulfillments = await prisma.sellerFulfillment.findMany({ where: { orderId: order.id }, orderBy: { sellerScope: 'asc' } });
  assert.equal(fulfillments.length, 2);
  const fulfillmentA = fulfillments.find((item) => item.sellerId === sellerA.id)!;
  const fulfillmentB = fulfillments.find((item) => item.sellerId === sellerB.id)!;
  assert.equal(fulfillmentA.status, 'paid');
  assert.equal(fulfillmentA.discountAmount.toString(), '10');
  assert.equal(fulfillmentB.discountAmount.toString(), '0');

  await FulfillmentService.transition({ fulfillmentId: fulfillmentA.id, targetStatus: 'confirmed', actor: { type: 'SELLER', userId: sellerA.id }, idempotencyKey: `confirm-a:${token}` });
  await assert.rejects(FulfillmentService.transition({ fulfillmentId: fulfillmentB.id, targetStatus: 'confirmed', actor: { type: 'SELLER', userId: sellerA.id }, idempotencyKey: `wrong-seller:${token}` }));
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productA.id } })).stockQuantity, 9);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productB.id } })).stockQuantity, 10);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'confirmed');

  await FulfillmentService.transition({ fulfillmentId: fulfillmentB.id, targetStatus: 'confirmed', actor: { type: 'SELLER', userId: sellerB.id }, idempotencyKey: `confirm-b:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillmentA.id, targetStatus: 'packing', actor: { type: 'SELLER', userId: sellerA.id }, idempotencyKey: `pack-a:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillmentB.id, targetStatus: 'packing', actor: { type: 'SELLER', userId: sellerB.id }, idempotencyKey: `pack-b:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillmentA.id, targetStatus: 'shipping', actor: { type: 'SHIPPER', userId: shipperA.id }, metadata: { assignSelf: true, trackingNumber: 'TRACK-A' }, idempotencyKey: `ship-a:${token}` });
  await assert.rejects(FulfillmentService.transition({ fulfillmentId: fulfillmentA.id, targetStatus: 'delivered', actor: { type: 'SHIPPER', userId: shipperB.id }, idempotencyKey: `wrong-shipper:${token}` }));
  await FulfillmentService.transition({ fulfillmentId: fulfillmentA.id, targetStatus: 'delivered', actor: { type: 'SHIPPER', userId: shipperA.id }, idempotencyKey: `deliver-a:${token}` });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'shipping');
  await FulfillmentService.transition({ fulfillmentId: fulfillmentB.id, targetStatus: 'shipping', actor: { type: 'SHIPPER', userId: shipperB.id }, metadata: { assignSelf: true, trackingNumber: 'TRACK-B' }, idempotencyKey: `ship-b:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillmentB.id, targetStatus: 'delivered', actor: { type: 'SHIPPER', userId: shipperB.id }, idempotencyKey: `deliver-b:${token}` });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'delivered');
  assert.equal(await prisma.inventoryReservation.count({ where: { orderId: order.id, status: 'CONSUMED' } }), 2);
});
