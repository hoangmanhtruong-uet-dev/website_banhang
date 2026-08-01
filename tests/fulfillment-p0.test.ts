import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('multi-seller schema owns items, state and shipper assignment per fulfillment', () => {
  const schema = read('prisma/schema.prisma');
  assert.match(schema, /model SellerFulfillment \{/);
  assert.match(schema, /@@unique\(\[orderId, sellerScope\]/);
  assert.match(schema, /fulfillmentId\s+String\?/);
  assert.match(schema, /model SellerFulfillmentTransition \{/);
});

test('checkout scopes vouchers and creates one fulfillment group per seller', () => {
  const source = read('src/lib/services/order.service.ts');
  assert.match(source, /item\.sellerId === voucher\.sellerId/);
  assert.match(source, /const fulfillmentGroups = new Map/);
  assert.match(source, /tx\.sellerFulfillment\.create/);
  assert.match(source, /data: \{ fulfillmentId: fulfillment\.id \}/);
});

test('seller and shipper mutations use fulfillment state machine with idempotency', () => {
  const seller = read('src/app/api/seller/fulfillments/[id]/route.ts');
  const shipper = read('src/app/api/shipper/orders/[id]/route.ts');
  for (const source of [seller, shipper]) {
    assert.match(source, /idempotency-key/);
    assert.match(source, /FulfillmentService\.transition/);
  }
});

test('shipper listing only exposes available or owned fulfillments and masks unassigned PII', () => {
  const source = read('src/app/api/shipper/orders/route.ts');
  assert.match(source, /status: 'packing', shipperId: null/);
  assert.match(source, /shipperId: session\.userId/);
  assert.match(source, /customerPhone: assignedToMe/);
  assert.match(source, /shippingAddress: assignedToMe/);
  assert.doesNotMatch(source, /prisma\.order\.findMany/);
});
