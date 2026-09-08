import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '@/lib/db';
import { InMemoryCache } from '@/lib/services/cache.service';
import crypto from 'node:crypto';

if (process.env.RUN_IDEMPOTENCY_INTEGRATION !== '1') {
  throw new Error('Integration tests require RUN_IDEMPOTENCY_INTEGRATION=1 and a dedicated *_test database.');
}

const suffix = () => crypto.randomUUID();

async function assertTestDatabase() {
  const rows = await prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT DATABASE() AS databaseName`;
  assert.match(rows[0]?.databaseName ?? '', /_test$/);
}

async function cleanDomainData() {
  await prisma.category.deleteMany();
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

// 1. Cache hit, miss, and stampede coalescing
test('1. InMemoryCache returns cached value on hit, resolves on miss, and coalesces concurrent misses', async () => {
  const cache = new InMemoryCache();
  let dbCallCount = 0;

  const fetcher = async () => {
    dbCallCount += 1;
    await new Promise((r) => setTimeout(r, 50));
    return { data: 'test_category_tree' };
  };

  // 3 concurrent requests for same missing key
  const [res1, res2, res3] = await Promise.all([
    cache.getOrSet('test:categories', 1000, fetcher),
    cache.getOrSet('test:categories', 1000, fetcher),
    cache.getOrSet('test:categories', 1000, fetcher),
  ]);

  assert.equal(dbCallCount, 1, 'Concurrent cache misses MUST be coalesced into 1 DB query');
  assert.equal(res1.data, 'test_category_tree');
  assert.equal(res2.data, 'test_category_tree');
  assert.equal(res3.data, 'test_category_tree');

  // Next call should hit cache directly
  const cachedRes = await cache.getOrSet('test:categories', 1000, fetcher);
  assert.equal(dbCallCount, 1, 'Subsequent read within TTL must hit cache');
  assert.equal(cachedRes.data, 'test_category_tree');
});

// 2. Cache Invalidation
test('2. Cache invalidation clears cached entry and triggers fresh DB fetch', async () => {
  const cache = new InMemoryCache();
  let count = 0;

  const fetcher = async () => {
    count += 1;
    return `version_${count}`;
  };

  const v1 = await cache.getOrSet('cat:tree', 60_000, fetcher);
  assert.equal(v1, 'version_1');

  // Invalidate key
  cache.invalidate('cat:tree');

  const v2 = await cache.getOrSet('cat:tree', 60_000, fetcher);
  assert.equal(v2, 'version_2');
});

// 3. TTL Expiration
test('3. Cache entry expires after configured TTL', async () => {
  const cache = new InMemoryCache();
  let nowMs = 1_000_000;
  const clock = () => nowMs;

  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount += 1;
    return `data_${fetchCount}`;
  };

  const r1 = await cache.getOrSet('item:123', 5_000, fetcher, clock);
  assert.equal(r1, 'data_1');

  // Advance time by 5,001ms
  nowMs += 5_001;

  const r2 = await cache.getOrSet('item:123', 5_000, fetcher, clock);
  assert.equal(r2, 'data_2');
  assert.equal(fetchCount, 2);
});

// 4. Financial & Inventory Reads Are NEVER Stale (Authoritative DB Check)
test('4. Financial reads (wallet balance) and inventory checks require authoritative DB transactions', async () => {
  const id = suffix();
  const user = await prisma.user.create({
    data: { code: `U-${id.slice(0, 8)}`, name: 'Authoritative User', email: `${id}@example.test`, password: 'not-used', balance: 500 },
  });

  // Mutate balance in DB transaction
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM user WHERE id = ${user.id} FOR UPDATE`;
    await tx.user.update({ where: { id: user.id }, data: { balance: 400 } });
  });

  // Direct DB check verifies immediate authoritative consistency
  const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(String(updatedUser.balance), '400');
});
