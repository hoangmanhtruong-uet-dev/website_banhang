import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/lib/db';
import { OrderService } from '../src/lib/services/order.service';
import { FulfillmentService } from '../src/lib/services/fulfillment.service';
import { ORDER_STATUS, OrderStateService } from '../src/lib/services/order-state.service';
import { RefundService } from '../src/lib/services/payment.service';
import { OutboxConsumerRegistry } from '../src/lib/services/outbox-consumers';
import { OutboxDispatcher } from '../src/lib/services/outbox-dispatcher';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') throw new Error('Commerce E2E requires the dedicated MySQL 8 test database.');
const uid = () => crypto.randomUUID();

async function clean() {
  await prisma.notificationDelivery.deleteMany();
  await prisma.processedOutboxEvent.deleteMany();
  await prisma.domainAuditLog.deleteMany();
  await prisma.payoutRequest.deleteMany();
  await prisma.sellerSettlement.deleteMany();
  await prisma.fulfillmentReturn.deleteMany();
  await prisma.codCollection.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.orderReturn.deleteMany();
  await prisma.orderStatusTransition.deleteMany();
  await prisma.sellerFulfillmentTransition.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.inventoryMovement.deleteMany();
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
  await prisma.sellerProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function drainOutbox() {
  const dispatcher = new OutboxDispatcher(prisma, new OutboxConsumerRegistry(prisma), { workerId: 'commerce-e2e', batchSize: 100, concurrency: 1 });
  for (let round = 0; round < 10; round += 1) {
    const result = await dispatcher.dispatchOnce();
    if (result.claimed === 0) return;
  }
  throw new Error('Outbox did not drain after 10 rounds');
}

before(async () => {
  const [row] = await prisma.$queryRaw<Array<{ name: string; version: string }>>`SELECT DATABASE() name, VERSION() version`;
  assert.match(row.name, /_test$/);
  assert.match(row.version, /^8\./);
});
beforeEach(clean);
after(async () => { await clean(); await prisma.$disconnect(); });

test('checkout -> wallet payment -> seller -> failed delivery/retry -> delivered -> return -> refund', async () => {
  const token = uid();
  const initialBalance = 1_000_000;
  const [customer, seller, shipper, admin] = await Promise.all([
    prisma.user.create({ data: { code: `CU-${token.slice(0, 7)}`, name: 'Customer', email: `${token}@customer.test`, phone: '0900000001', password: 'x', balance: initialBalance } }),
    prisma.user.create({ data: { code: `SE-${token.slice(0, 7)}`, name: 'Seller', email: `${token}@seller.test`, password: 'x', isSeller: true } }),
    prisma.user.create({ data: { code: `SH-${token.slice(0, 7)}`, name: 'Shipper', email: `${token}@shipper.test`, password: 'x', role: 'shipper' } }),
    prisma.user.create({ data: { code: `AD-${token.slice(0, 7)}`, name: 'Admin', email: `${token}@admin.test`, password: 'x', role: 'admin' } }),
  ]);
  await prisma.sellerProfile.create({ data: { userId: seller.id, status: 'APPROVED', businessName: 'E2E Shop', businessAddress: 'Hà Nội', commissionRate: 5, decidedAt: new Date(), decidedBy: admin.id } });
  const product = await prisma.product.create({ data: { code: `P-${token.slice(0, 8)}`, sku: `SKU-${token.slice(0, 8)}`, slug: `commerce-e2e-${token}`, name: 'Sản phẩm E2E', price: 200_000, stockQuantity: 10, sellerId: seller.id } });

  const order = await OrderService.createOrder({
    userId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone!,
    shippingAddress: '1 Tràng Tiền, Hà Nội',
    paymentMethod: 'Banking',
    idempotencyKey: `checkout:${token}`,
    items: [{ productId: product.id, quantity: 2 }],
  });

  const paidOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payment: true, fulfillments: true } });
  assert.equal(paidOrder.status, 'paid');
  assert.equal(paidOrder.paymentStatus, 'paid');
  assert.equal(paidOrder.payment?.status, 'completed');
  assert.equal(paidOrder.fulfillments[0]?.status, 'paid');
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 8);
  const fulfillment = paidOrder.fulfillments[0]!;

  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'confirmed', actor: { type: 'SELLER', userId: seller.id }, idempotencyKey: `seller-confirm:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'packing', actor: { type: 'SELLER', userId: seller.id }, idempotencyKey: `seller-pack:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'shipping', actor: { type: 'SHIPPER', userId: shipper.id }, metadata: { assignSelf: true, trackingNumber: `TRACK-${token.slice(0, 8)}`, shippingProvider: 'E2E Express' }, idempotencyKey: `shipper-pick:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'delivery_failed', actor: { type: 'SHIPPER', userId: shipper.id }, reason: 'Khách không nghe máy', idempotencyKey: `delivery-failed:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'shipping', actor: { type: 'SHIPPER', userId: shipper.id }, metadata: { trackingNumber: `TRACK-${token.slice(0, 8)}` }, idempotencyKey: `delivery-retry:${token}` });
  await FulfillmentService.transition({ fulfillmentId: fulfillment.id, targetStatus: 'delivered', actor: { type: 'SHIPPER', userId: shipper.id }, metadata: { proofUrl: 'https://res.cloudinary.com/demo/image/upload/proof.jpg', recipientName: customer.name, latitude: 21.0285, longitude: 105.8542 }, idempotencyKey: `delivery-success:${token}` });

  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'delivered');
  assert.equal(await prisma.deliveryAttempt.count({ where: { fulfillmentId: fulfillment.id } }), 2);
  const settlement = await prisma.sellerSettlement.findUniqueOrThrow({ where: { fulfillmentId: fulfillment.id } });
  assert.equal(settlement.grossAmount.toString(), '400000');
  assert.equal(settlement.commissionAmount.toString(), '20000');

  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: customer.id }, reason: 'Sản phẩm không đúng mô tả', idempotencyKey: `return-request:${token}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.RETURN_APPROVED, actor: { type: 'ADMIN', userId: admin.id }, reason: 'Đủ điều kiện trả hàng', idempotencyKey: `return-approve:${token}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.RETURNING, actor: { type: 'ADMIN', userId: admin.id }, reason: 'Đơn đang được hoàn về seller', idempotencyKey: `return-shipping:${token}` });
  await OrderStateService.transition({ orderId: order.id, targetStatus: ORDER_STATUS.RETURNED, actor: { type: 'ADMIN', userId: admin.id }, reason: 'Seller đã nhận hàng hoàn', idempotencyKey: `return-received:${token}` });

  const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
  await prisma.$transaction((tx) => RefundService.create(tx, { paymentId: payment.id, userId: customer.id, amount: payment.amount, currency: payment.currency, idempotencyKey: `refund:${token}` }));
  await drainOutbox();

  const [finalOrder, finalPayment, finalCustomer, orderReturn, deliveries, audits] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
    prisma.user.findUniqueOrThrow({ where: { id: customer.id } }),
    prisma.orderReturn.findFirstOrThrow({ where: { orderId: order.id } }),
    prisma.notificationDelivery.findMany({ where: { recipient: { in: [customer.email, customer.phone!] } } }),
    prisma.domainAuditLog.count({ where: { entityType: { in: ['Order', 'SellerFulfillment'] } } }),
  ]);
  assert.equal(finalOrder.status, 'refunded');
  assert.equal(finalOrder.paymentStatus, 'refunded');
  assert.equal(finalPayment.status, 'REFUNDED');
  assert.equal(finalPayment.refundedAmount.toString(), '400000');
  assert.equal(finalCustomer.balance.toString(), String(initialBalance));
  assert.equal(orderReturn.status, 'COMPLETED');
  assert.ok(deliveries.some((item) => item.channel === 'email' && item.status === 'sent'));
  assert.ok(deliveries.some((item) => item.channel === 'sms' && item.status === 'sent'));
  assert.ok(audits >= 10);
});
