import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { outboxConfig, OUTBOX_EVENT } from '@/lib/services/outbox.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), 3000)),
    ]);
    const now = new Date();
    const heartbeat = await prisma.workerHeartbeat.findFirst({
      where: { status: 'ready', expiresAt: { gt: now } },
      orderBy: { lastPollAt: 'desc' },
    });
    const requiredVersion = process.env.OUTBOX_REQUIRED_WORKER_VERSION;
    const requiredIdentity = process.env.OUTBOX_REQUIRED_WORKER_ID_PREFIX;
    const identityValid = !requiredIdentity || heartbeat?.workerId.startsWith(requiredIdentity);
    const versionValid = !requiredVersion || heartbeat?.version === requiredVersion;
    const criticalDeadLetters = await prisma.outboxEvent.count({
      where: { status: 'DEAD_LETTER', eventType: OUTBOX_EVENT.REFUND_REQUIRED },
    });
    const deadLetterHealthy = outboxConfig.deadLetterCriticalThreshold === 0
      || criticalDeadLetters < outboxConfig.deadLetterCriticalThreshold;
    if (!heartbeat || !identityValid || !versionValid || !deadLetterHealthy) {
      return NextResponse.json({
        status: 'not_ready', database: 'connected',
        worker: heartbeat ? {
          workerId: heartbeat.workerId, status: heartbeat.status, version: heartbeat.version,
          lastPollAt: heartbeat.lastPollAt, expiresAt: heartbeat.expiresAt,
        } : null,
        checks: { heartbeat: Boolean(heartbeat), identityValid, versionValid, deadLetterHealthy, criticalDeadLetters },
        timestamp: now.toISOString(),
      }, { status: 503 });
    }
    return NextResponse.json({
      status: 'ready', database: 'connected',
      worker: { workerId: heartbeat.workerId, version: heartbeat.version, lastPollAt: heartbeat.lastPollAt },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error', database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}