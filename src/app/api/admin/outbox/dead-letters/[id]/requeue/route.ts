import { NextRequest, NextResponse } from 'next/server';
import { createHandler } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth';
import { DeadLetterService } from '@/lib/services/outbox-reconciliation';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async () => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const event = await DeadLetterService.requeue(id, admin.userId);
  return NextResponse.json({ event });
  })(req);
}
