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

test('seller revenue is scoped to delivered fulfillments owned by the current seller', () => {
  const source = read('src/app/api/seller/analytics/route.ts');
  assert.match(source, /sellerId: session\.userId/);
  assert.match(source, /item\.status === 'delivered'/);
  assert.match(source, /Money\.sum\(revenueRows\.map\(item => item\.total\)\)/);
  assert.match(source, /REVENUE_STATUSES/);
});

test('seller voucher CRUD derives ownership from session and validates payloads', () => {
  const collection = read('src/app/api/seller/vouchers/route.ts');
  const member = read('src/app/api/seller/vouchers/[id]/route.ts');
  assert.match(collection, /sellerVoucherCreateSchema\.parse/);
  assert.match(collection, /sellerId: session\.userId/);
  assert.match(member, /sellerVoucherUpdateSchema\.parse/);
  assert.match(member, /where: \{ id, sellerId: session\.userId \}/);
});

test('products are soft-deleted and excluded from storefront and checkout', () => {
  const schema = read('prisma/schema.prisma');
  const member = read('src/app/api/products/[id]/route.ts');
  const collection = read('src/app/api/products/route.ts');
  const checkout = read('src/lib/services/order.service.ts');
  assert.match(schema, /deletedAt\s+DateTime\?/);
  assert.match(member, /deletedAt: new Date\(\)/);
  assert.doesNotMatch(member, /prisma\.product\.delete\(/);
  assert.match(collection, /deletedAt: null/);
  assert.match(checkout, /deletedAt: null/);
});

test('admin role writes accept only the canonical role enum', () => {
  const validation = read('src/lib/validations/index.ts');
  const roleRoute = read('src/app/api/admin/users/[id]/role/route.ts');
  assert.match(validation, /USER_ROLES = \['user', 'admin', 'shipper'\]/);
  assert.match(roleRoute, /roleUpdateSchema\.parse/);
  assert.match(roleRoute, /activeAdmins <= 1/);
});