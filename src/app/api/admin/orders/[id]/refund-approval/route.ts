import { NextRequest, NextResponse } from 'next/server';
import { createHandler } from '@/lib/api-handler';
import { requireAdmin } from '@/lib/auth';
import { LatePaymentRefundService } from '@/lib/services/late-payment-refund.service';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async () => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const result = await LatePaymentRefundService.approve(id, admin.userId);
  return NextResponse.json({ refund: result.refund, replayed: result.replayed }, { status: result.replayed ? 200 : 201 });
  })(req);
}
