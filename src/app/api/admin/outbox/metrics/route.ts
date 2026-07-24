import { NextResponse } from 'next/server';
import { createHandler } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth';
import { outboxMetrics } from '@/lib/services/outbox-reconciliation';

export const dynamic = 'force-dynamic';

export const GET = createHandler(async () => {
  await requireAdmin();
  return NextResponse.json(await outboxMetrics());
});
