import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST as webhookPost } from '@/app/api/webhook/route';
import { OrderService } from '@/lib/services/order/order.service';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { verifyWebhookSignature, resolveWebhookSecret } from '@/lib/security/webhook-verifier';

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
  await prisma.inventoryReservation.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.review.deleteMany();
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

async function createUser() {
  const id = suffix();
  return prisma.user.create({
    data: { code: `U-${id.slice(0, 8)}`, name: 'Webhook User', email: `${id}@example.test`, password: 'not-used', balance: 500 },
  });
}

async function createProduct() {
  const id = suffix();
  return prisma.product.create({
    data: { code: `P-${id.slice(0, 8)}`, sku: `SKU-${id.slice(0, 8)}`, slug: `wh-${id}`, name: 'Webhook product', price: 50, stockQuantity: 20 },
  });
}

async function createOrder(userId: string, productId: string) {
  const key = `order:${suffix()}`;
  const input = {
    userId, idempotencyKey: key, customerName: 'Webhook Test', customerEmail: 'wh@example.test',
    customerPhone: '0900000000', shippingAddress: 'Test Address', paymentMethod: 'COD',
    items: [{ productId, quantity: 1 }],
  };
  const result = await IdempotencyService.execute({
    scopeId: userId, operation: 'order:create', method: 'POST', key, request: input,
    handler: async (tx) => {
      const order = await OrderService.createOrderInTransaction(tx, input);
      return { status: 201, body: order, resourceType: 'order', resourceId: order.id };
    },
  });
  return result.body;
}

function signedWebhookRequest(
  body: unknown,
  timestamp: number | string | null = Math.floor(Date.now() / 1000),
  signatureOverride?: string | null,
  secretOverride?: string,
) {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const secret = secretOverride ?? (process.env.WEBHOOK_SECRET as string);

  let signature: string | null;
  if (signatureOverride !== undefined) {
    signature = signatureOverride;
  } else if (timestamp !== null && secret) {
    signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  } else {
    signature = null;
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (timestamp !== null) headers['x-webhook-timestamp'] = String(timestamp);
  if (signature !== null) headers['x-webhook-signature'] = signature;

  return new NextRequest('http://localhost/api/webhook', {
    method: 'POST', body: rawBody, headers,
  });
}

test('1. Valid webhook -> accepted and updates state', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const res = await webhookPost(signedWebhookRequest(event));

  assert.equal(res.status, 200);
  const json = await res.json() as { received: boolean; duplicate: boolean };
  assert.equal(json.received, true);
  assert.equal(json.duplicate, false);

  const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(updatedOrder.status, 'paid');
  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
});

test('2. Invalid signature -> rejected with 401 and no DB changes', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const eventId = `evt-bad-sig-${suffix()}`;
  const event = { provider: 'internal-test', eventId, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const res = await webhookPost(signedWebhookRequest(event, undefined, 'f'.repeat(64)));

  assert.equal(res.status, 401);
  assert.equal(await prisma.webhookEvent.count({ where: { providerEventId: eventId } }), 0);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, 'pending');
});

test('3. Missing signature or missing timestamp -> rejected with 401', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-missing-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const noSig = await webhookPost(signedWebhookRequest(event, Math.floor(Date.now() / 1000), null));
  assert.equal(noSig.status, 401);

  const noTime = await webhookPost(signedWebhookRequest(event, null, 'a'.repeat(64)));
  assert.equal(noTime.status, 401);
});

test('4. Modified payload -> rejected with 401', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const originalEvent = { provider: 'internal-test', eventId: `evt-tamper-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = process.env.WEBHOOK_SECRET as string;
  const signature = createHmac('sha256', secret).update(`${timestamp}.${JSON.stringify(originalEvent)}`).digest('hex');

  const tamperedEvent = { ...originalEvent, status: 'failed', eventType: 'payment.failed' };
  const tamperedReq = new NextRequest('http://localhost/api/webhook', {
    method: 'POST',
    body: JSON.stringify(tamperedEvent),
    headers: { 'content-type': 'application/json', 'x-webhook-timestamp': String(timestamp), 'x-webhook-signature': signature },
  });

  const res = await webhookPost(tamperedReq);
  assert.equal(res.status, 401);
});

test('5. Replayed webhook (expired timestamp) -> rejected with 401', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-stale-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const staleTimestamp = Math.floor(Date.now() / 1000) - 301;

  const res = await webhookPost(signedWebhookRequest(event, staleTimestamp));
  assert.equal(res.status, 401);
});

test('6. Duplicate webhook -> idempotent response', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-dedup-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const req1 = signedWebhookRequest(event);
  const req2 = signedWebhookRequest(event);

  const res1 = await webhookPost(req1);
  assert.equal(res1.status, 200);
  const json1 = await res1.json() as { duplicate: boolean };
  assert.equal(json1.duplicate, false);

  const res2 = await webhookPost(req2);
  assert.equal(res2.status, 200);
  const json2 = await res2.json() as { duplicate: boolean };
  assert.equal(json2.duplicate, true);

  assert.equal(await prisma.webhookEvent.count({ where: { provider: event.provider, providerEventId: event.eventId } }), 1);
  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
});

test('7. Invalid webhook -> absolutely zero financial or order state mutation', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const balanceBefore = user.balance;
  const initialPaymentsCount = await prisma.payment.count();
  const initialWebhookEventsCount = await prisma.webhookEvent.count();

  const invalidEvent = { provider: 'internal-test', eventId: `evt-zeromutate-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
  const res = await webhookPost(signedWebhookRequest(invalidEvent, undefined, '0'.repeat(64)));

  assert.equal(res.status, 401);

  assert.equal(await prisma.payment.count(), initialPaymentsCount);
  assert.equal(await prisma.webhookEvent.count(), initialWebhookEventsCount);

  const refreshedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(refreshedOrder.status, 'pending');

  const refreshedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(String(refreshedUser.balance), String(balanceBefore));
});

test('8. Concurrent duplicate webhook requests -> exactly one financial effect', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-concurrent-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const requests = Array.from({ length: 5 }, () => webhookPost(signedWebhookRequest(event)));
  const responses = await Promise.all(requests);

  assert.ok(responses.every((res) => res.status === 200));

  const jsonBodies = await Promise.all(responses.map((res) => res.json() as Promise<{ duplicate: boolean }>));
  const newProcessingCount = jsonBodies.filter((body) => body.duplicate === false).length;
  const duplicateCount = jsonBodies.filter((body) => body.duplicate === true).length;

  assert.equal(newProcessingCount, 1);
  assert.equal(duplicateCount, 4);

  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
  assert.equal(await prisma.webhookEvent.count({ where: { provider: event.provider, providerEventId: event.eventId } }), 1);
});

test('9. Provider-specific secret resolution (e.g. WEBHOOK_SECRET_MOMO)', () => {
  process.env.WEBHOOK_SECRET_MOMO = 'a'.repeat(32);
  const resolvedMomo = resolveWebhookSecret('momo');
  assert.equal(resolvedMomo, 'a'.repeat(32));

  const resolvedDefault = resolveWebhookSecret('unknown_provider');
  assert.equal(resolvedDefault, process.env.WEBHOOK_SECRET);
  delete process.env.WEBHOOK_SECRET_MOMO;
});
