import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalJson, requestFingerprint, requireIdempotencyKey } from '../src/lib/idempotency';
import { ValidationError } from '../src/lib/errors';
import { clearCheckoutKey, getOrCreateCheckoutKey, type StorageLike } from '../src/lib/checkout-idempotency';
import { buildProviderIdempotencyKey } from '../src/lib/services/payment-provider';

const read = (path: string) => readFileSync(path, 'utf8');

test('canonical fingerprint ignores JSON object key order', () => {
  const first = { customer: { name: 'A', phone: '1' }, items: [{ productId: 'p1', quantity: 2 }] };
  const second = { items: [{ quantity: 2, productId: 'p1' }], customer: { phone: '1', name: 'A' } };
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(requestFingerprint(first), requestFingerprint(second));
  assert.match(requestFingerprint(first), /^[a-f0-9]{64}$/);
});

test('fingerprint changes when business payload changes', () => {
  assert.notEqual(requestFingerprint({ amount: 100 }), requestFingerprint({ amount: 101 }));
});

test('idempotency key contract requires a bounded safe header', () => {
  assert.equal(requireIdempotencyKey(new Headers({ 'Idempotency-Key': 'checkout:abc-123' })), 'checkout:abc-123');
  assert.throws(() => requireIdempotencyKey(new Headers()), ValidationError);
  assert.throws(() => requireIdempotencyKey(new Headers({ 'Idempotency-Key': 'bad key\nvalue' })), TypeError);
  assert.throws(() => requireIdempotencyKey(new Headers({ 'Idempotency-Key': 'x'.repeat(256) })), ValidationError);
});

test('migration has durable scoped claims, cleanup, provider, refund, and webhook constraints', () => {
  const migration = read('prisma/migrations/20260723160000_add_durable_idempotency/migration.sql');
  assert.match(migration, /UNIQUE INDEX `idempotency_record_scopeId_operation_key_key`/);
  assert.match(migration, /INDEX `idempotency_record_expiresAt_idx`/);
  assert.match(migration, /UNIQUE INDEX `order_idempotencyScope_idempotencyKey_key`/);
  assert.match(migration, /UNIQUE INDEX `payment_providerTransactionId_key`/);
  assert.match(migration, /UNIQUE INDEX `refund_providerRefundId_key`/);
  assert.match(migration, /UNIQUE INDEX `webhook_event_provider_providerEventId_key`/);
});

test('provider idempotency identifiers are deterministic and operation-scoped', () => {
  const payment = buildProviderIdempotencyKey('payment:create:order-1', 'user-1', 'request-key');
  assert.equal(buildProviderIdempotencyKey('payment:create:order-1', 'user-1', 'request-key'), payment);
  assert.notEqual(buildProviderIdempotencyKey('payment:refund:payment-1', 'user-1', 'request-key'), payment);
  assert.notEqual(buildProviderIdempotencyKey('payment:create:order-1', 'user-2', 'request-key'), payment);
});
test('protected mutation routes enforce reusable durable idempotency', () => {
  for (const route of ['src/app/api/orders/route.ts', 'src/app/api/payments/route.ts', 'src/app/api/refunds/route.ts']) {
    const source = read(route);
    assert.match(source, /requireIdempotencyKey\(req\.headers\)/);
    assert.match(source, /IdempotencyService\.execute/);
    assert.match(source, /Idempotency-Replayed/);
  }
});

test('webhook verifies HMAC before writing its durable event record', () => {
  const source = read('src/app/api/webhook/route.ts');
  assert.ok(source.indexOf('validSignature(') < source.indexOf('tx.webhookEvent.create'));
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /provider_providerEventId/);
  assert.match(source, /PaymentService\.recordWebhookSuccess/);
  assert.ok(source.indexOf('tx.webhookEvent.create') < source.indexOf('PaymentService.recordWebhookSuccess'));
});
test('checkout key lifecycle is stable per user/payload/tab and resets on mutations, expiry, or success', async () => {
  class MemoryStorage implements StorageLike {
    private values = new Map<string, string>();
    getItem(key: string) { return this.values.get(key) ?? null; }
    setItem(key: string, value: string) { this.values.set(key, value); }
    removeItem(key: string) { this.values.delete(key); }
  }
  const tabOne = new MemoryStorage();
  const tabTwo = new MemoryStorage();
  const payload = { address: 'A', method: 'COD', items: [{ productId: 'p1', quantity: 1 }] };
  const first = await getOrCreateCheckoutKey(tabOne, 'user-1', payload, 1_000, 10_000);
  assert.equal(await getOrCreateCheckoutKey(tabOne, 'user-1', { items: [{ quantity: 1, productId: 'p1' }], method: 'COD', address: 'A' }, 2_000, 10_000), first);
  assert.notEqual(await getOrCreateCheckoutKey(tabTwo, 'user-1', payload, 2_000, 10_000), first);
  assert.notEqual(await getOrCreateCheckoutKey(tabOne, 'user-1', { ...payload, method: 'MoMo' }, 2_000, 10_000), first);
  const changed = await getOrCreateCheckoutKey(tabOne, 'user-1', { ...payload, address: 'B' }, 2_000, 10_000);
  assert.notEqual(changed, first);
  assert.notEqual(await getOrCreateCheckoutKey(tabOne, 'user-2', { ...payload, address: 'B' }, 2_000, 10_000), changed);
  const expiring = await getOrCreateCheckoutKey(tabOne, 'user-2', payload, 3_000, 10);
  assert.notEqual(await getOrCreateCheckoutKey(tabOne, 'user-2', payload, 3_011, 10), expiring);
  clearCheckoutKey(tabOne);
  assert.notEqual(await getOrCreateCheckoutKey(tabOne, 'user-2', payload, 4_000, 10_000), expiring);
});