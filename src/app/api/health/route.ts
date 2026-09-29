import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  try {
    // Test Database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: 'connected',
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          error: error?.message || 'Database query failed',
        },
      },
      { status: 503 }
    );
  }
}
