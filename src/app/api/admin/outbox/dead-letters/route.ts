import { NextRequest, NextResponse } from 'next/server';
import { createHandler } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth';
import { DeadLetterService } from '@/lib/services/outbox-reconciliation';

export const dynamic = 'force-dynamic';

export const GET = createHandler(async (req: NextRequest) => {
  await requireAdmin();
  const requested = Number(new URL(req.url).searchParams.get('limit') ?? 100);
  const limit = Number.isInteger(requested) ? requested : 100;
  const events = await DeadLetterService.list(undefined, limit);
  return NextResponse.json({ events });
});
