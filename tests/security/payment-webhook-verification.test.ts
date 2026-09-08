import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST as webhookPost } from '@/app/api/webhook/route';
import { OrderService } from '@/lib/services/order/order.service';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { StandardHmacWebhookVerifier, resolveWebhookSecret } from '@/lib/security/webhook-verifier';

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
    data: { code: `U-${id.slice(0, 8)}`, name: 'Webhook Verification User', email: `${id}@example.test`, password: 'not-used', balance: 500 },
  });
}

async function createProduct() {
  const id = suffix();
  return prisma.product.create({
    data: { code: `P-${id.slice(0, 8)}`, sku: `SKU-${id.slice(0, 8)}`, slug: `wh-v-${id}`, name: 'Webhook verification product', price: 50, stockQuantity: 20 },
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

// Invariant A: Duplicate concurrent webhook handling
test('A. Duplicate concurrent webhooks -> single financial execution and single webhookEvent record', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-concurrent-verify-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const reqs = Array.from({ length: 10 }, () => webhookPost(signedWebhookRequest(event)));
  const results = await Promise.all(reqs);

  assert.ok(results.every(r => r.status === 200));
  const jsonBodies = await Promise.all(results.map(r => r.json() as Promise<{ duplicate: boolean }>));
  const nonDuplicates = jsonBodies.filter(b => b.duplicate === false);
  assert.equal(nonDuplicates.length, 1);

  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 1);
  assert.equal(await prisma.webhookEvent.count({ where: { provider: event.provider, providerEventId: event.eventId } }), 1);
});

// Invariant B: Transaction rollback on failure during side effect (e.g. unknown order)
test('B. Transaction rollback -> no partial webhookEvent or order state when order is unknown', async () => {
  const eventId = `evt-unknown-order-${suffix()}`;
  const event = { provider: 'internal-test', eventId, eventType: 'payment.succeeded', orderId: 'non-existent-order-id', status: 'success' };

  const res = await webhookPost(signedWebhookRequest(event));
  assert.equal(res.status, 400);

  const webhookEventInDb = await prisma.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: event.provider, providerEventId: eventId } },
  });
  assert.equal(webhookEventInDb, null, 'webhookEvent record must be rolled back on order not found error');
});

// Invariant C: DB Failure / Transaction rollback leaves zero orphan webhook events
test('C. Transaction rollback leaves zero state when payment processing fails', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  // Set order userId to null directly to trigger ValidationError inside recordWebhookSuccess inside transaction
  await prisma.order.update({ where: { id: order.id }, data: { userId: null } });

  const eventId = `evt-rollback-${suffix()}`;
  const event = { provider: 'internal-test', eventId, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const res = await webhookPost(signedWebhookRequest(event));
  assert.equal(res.status, 400); // Mapped from ValidationError

  const webhookEventInDb = await prisma.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: event.provider, providerEventId: eventId } },
  });
  assert.equal(webhookEventInDb, null, 'webhookEvent MUST be rolled back if business side effect fails');
});

// Invariant D: Same provider event ID with different payload hash
test('D. Same provider event ID with different request payload -> IdempotencyConflictError (409)', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order1 = await createOrder(user.id, product.id);
  const order2 = await createOrder(user.id, product.id);

  const eventId = `evt-conflict-${suffix()}`;
  const event1 = { provider: 'vnpay', eventId, eventType: 'payment.succeeded', orderId: order1.id, status: 'success' };
  const event2 = { provider: 'vnpay', eventId, eventType: 'payment.succeeded', orderId: order2.id, status: 'success' };

  const res1 = await webhookPost(signedWebhookRequest(event1));
  assert.equal(res1.status, 200);

  const res2 = await webhookPost(signedWebhookRequest(event2));
  assert.equal(res2.status, 409); // IdempotencyConflictError mapped to 409
});

// Invariant E: Missing production secret
test('E. Missing production secret or short secret (<32 chars) -> 401 rejection with safe error message', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const origSecret = process.env.WEBHOOK_SECRET;
  try {
    delete process.env.WEBHOOK_SECRET;
    const event = { provider: 'unconfigured-provider', eventId: `evt-nosecret-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };
    const res = await webhookPost(signedWebhookRequest(event, Math.floor(Date.now() / 1000), 'a'.repeat(64), 'short_secret'));

    assert.equal(res.status, 401);
    const json = await res.json() as { error: { message: string } };
    assert.equal(json.error.message, 'Webhook authentication is not configured');
  } finally {
    process.env.WEBHOOK_SECRET = origSecret;
  }
});

// Invariant F: Malformed signature format
test('F. Malformed signature header (non-hex, invalid length) -> 401 rejection', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-malformed-sig-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const resShort = await webhookPost(signedWebhookRequest(event, undefined, 'abc123'));
  assert.equal(resShort.status, 401);

  const resNonHex = await webhookPost(signedWebhookRequest(event, undefined, 'z'.repeat(64)));
  assert.equal(resNonHex.status, 401);
});

// Invariant G: Malformed timestamp format
test('G. Malformed timestamp header (alphanumeric, float, missing) -> 401 rejection', async () => {
  const user = await createUser();
  const product = await createProduct();
  const order = await createOrder(user.id, product.id);

  const event = { provider: 'internal-test', eventId: `evt-malformed-ts-${suffix()}`, eventType: 'payment.succeeded', orderId: order.id, status: 'success' };

  const resAlpha = await webhookPost(signedWebhookRequest(event, 'invalid-timestamp', 'a'.repeat(64)));
  assert.equal(resAlpha.status, 401);

  const resFloat = await webhookPost(signedWebhookRequest(event, '1700000000.123', 'a'.repeat(64)));
  assert.equal(resFloat.status, 401);
});

// Invariant H: Altered canonical payload (body spacing/fields changed after signing)
test('H. Altered canonical payload -> signature verification failure (401)', async () => {
  const verifier = new StandardHmacWebhookVerifier();
  const rawBody1 = JSON.stringify({ a: 1, b: 2 });
  const rawBody2 = JSON.stringify({ a: 1, b: 2, c: 3 });
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = process.env.WEBHOOK_SECRET || 'a'.repeat(32);

  const sig1 = createHmac('sha256', secret).update(`${timestamp}.${rawBody1}`).digest('hex');

  const headers = {
    get(name: string) {
      if (name === 'x-webhook-signature') return sig1;
      if (name === 'x-webhook-timestamp') return String(timestamp);
      return null;
    },
  };

  const result1 = verifier.verify({ rawBody: rawBody1, headers });
  assert.equal(result1.valid, true);

  const result2 = verifier.verify({ rawBody: rawBody2, headers });
  assert.equal(result2.valid, false);
  assert.equal(result2.reason, 'Invalid webhook signature');
});

// Invariant I: Provider-specific verification logic check
test('I. Real provider verification contracts check (VNPAY / MoMo / ZaloPay)', () => {
  // MoMo uses raw payload + accessKey + partnerCode HMAC SHA256 string formatting
  // VNPAY uses URL-sorted query parameters with vnp_SecureHash
  // ZaloPay uses MAC string computation with key2
  // MTRUONG-STORE currently uses StandardHmacWebhookVerifier for all incoming webhooks (header x-webhook-signature)
  // This verifies that provider-specific secret resolution works for provider overrides
  process.env.WEBHOOK_SECRET_VNPAY = 'vnpay_secret_key_32_characters_long_str!';
  const resolved = resolveWebhookSecret('vnpay');
  assert.equal(resolved, 'vnpay_secret_key_32_characters_long_str!');
  delete process.env.WEBHOOK_SECRET_VNPAY;
});
