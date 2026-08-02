import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { outboxMetrics, OutboxReconciliationService } from '@/lib/services/outbox-reconciliation';

export const dynamic = 'force-dynamic';

export const GET = createHandler(async (_request: NextRequest) => {
  await requireAdmin();
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const databaseLatencyMs = Date.now() - startedAt;
  const now = new Date();
  const [worker, metrics, anomalies, failedDeliveries, pendingPayouts, failedFulfillments, lowStock] = await Promise.all([
    prisma.workerHeartbeat.findFirst({ orderBy: { lastPollAt: 'desc' } }),
    outboxMetrics(prisma, now),
    OutboxReconciliationService.audit(prisma, now, 100),
    prisma.notificationDelivery.count({ where: { status: 'failed' } }),
    prisma.payoutRequest.count({ where: { status: { in: ['REQUESTED', 'APPROVED', 'PROCESSING'] } } }),
    prisma.sellerFulfillment.count({ where: { status: 'delivery_failed' } }),
    prisma.product.count({ where: { deletedAt: null, stockQuantity: { lte: 5 } } }),
  ]);
  const workerHealthy = Boolean(worker && worker.expiresAt > now && worker.status === 'ready');
  const status = workerHealthy && metrics.outbox_dead_letter_total === 0 && anomalies.length === 0 ? 'healthy' : 'degraded';
  return {
    status,
    timestamp: now,
    database: { connected: true, latencyMs: databaseLatencyMs },
    worker: worker ? { id: worker.workerId, status: worker.status, version: worker.version, healthy: workerHealthy, lastPollAt: worker.lastPollAt, expiresAt: worker.expiresAt, lastError: worker.lastError } : null,
    metrics: { ...metrics, failedDeliveries, pendingPayouts, failedFulfillments, lowStock },
    anomalies: anomalies.slice(0, 20),
  };
});
