import prisma from '../src/lib/db';
import { StorageService } from '../src/lib/services/storage.service';
import { SessionService } from '../src/lib/services/session.service';
import {
  findExpiredUploadReservationIds,
  releaseUploadReservation,
} from '../src/lib/services/upload-quota.service';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseStorageKeys(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

async function deleteStorageKeys(keys: readonly string[]): Promise<{ deleted: number; remaining: string[] }> {
  let deleted = 0;
  const remaining: string[] = [];
  for (const key of keys) {
    try {
      await StorageService.delete(key);
      deleted += 1;
    } catch {
      remaining.push(key);
    }
  }
  return { deleted, remaining };
}

async function main() {
  const now = new Date();
  let releasedReservations = 0;
  let deletedStorageObjects = 0;

  while (true) {
    const ids = await findExpiredUploadReservationIds(now, 100);
    if (ids.length === 0) break;
    for (const id of ids) {
      await releaseUploadReservation(id, now);
      releasedReservations += 1;
    }
  }

  // RELEASED reservations retain keys until every provider delete succeeds.
  // This makes transient Cloudinary/local failures retryable on the next run.
  const releasedWithKeys = await prisma.uploadReservation.findMany({
    where: { status: 'RELEASED', storageKeys: { not: null } },
    orderBy: { updatedAt: 'asc' },
    take: 500,
    select: { id: true, storageKeys: true },
  });
  for (const reservation of releasedWithKeys) {
    if (!reservation.storageKeys) continue;
    const result = await deleteStorageKeys(parseStorageKeys(reservation.storageKeys));
    deletedStorageObjects += result.deleted;
    await prisma.uploadReservation.updateMany({
      where: { id: reservation.id, status: 'RELEASED' },
      data: { storageKeys: result.remaining.length > 0 ? JSON.stringify(result.remaining) : null },
    });
  }

  const staleAssets = await prisma.uploadAsset.findMany({
    where: {
      OR: [
        { status: 'AVAILABLE', createdAt: { lt: new Date(now.getTime() - DAY_MS) } },
        { status: 'DELETE_FAILED' },
        { status: 'DELETING', updatedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: { id: true, storageKey: true, status: true },
  });
  let deletedAssets = 0;
  for (const asset of staleAssets) {
    const claimed = await prisma.uploadAsset.updateMany({
      where: { id: asset.id, status: asset.status },
      data: { status: 'DELETING' },
    });
    if (claimed.count !== 1) continue;
    try {
      await StorageService.delete(asset.storageKey);
      await prisma.uploadAsset.updateMany({
        where: { id: asset.id, status: 'DELETING' },
        data: { status: 'DELETED' },
      });
      deletedAssets += 1;
    } catch {
      await prisma.uploadAsset.updateMany({
        where: { id: asset.id, status: 'DELETING' },
        data: { status: 'DELETE_FAILED' },
      });
    }
  }

  const [rateBuckets, quotaBuckets, reservations, tombstones, sessions] = await Promise.all([
    prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.uploadQuotaBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.uploadReservation.deleteMany({
      where: {
        updatedAt: { lt: new Date(now.getTime() - 7 * DAY_MS) },
        OR: [
          { status: 'COMPLETED' },
          { status: 'RELEASED', storageKeys: null },
        ],
      },
    }),
    prisma.uploadAsset.deleteMany({
      where: { status: 'DELETED', updatedAt: { lt: new Date(now.getTime() - 30 * DAY_MS) } },
    }),
    SessionService.cleanupExpiredSessions(now),
  ]);

  console.log(JSON.stringify({
    event: 'security.cleanup.complete',
    releasedReservations,
    deletedStorageObjects,
    deletedAssets,
    rateBuckets: rateBuckets.count,
    quotaBuckets: quotaBuckets.count,
    reservations: reservations.count,
    assetTombstones: tombstones.count,
    sessions: sessions.count,
  }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Security cleanup failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
