import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/errors';
import { FulfillmentService } from '@/lib/services/fulfillment.service';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const actor = await requireAdmin(); const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    return FulfillmentService.transitionOrderFulfillments({ orderId: (await context.params).id, targetStatus: 'packing', actor: { type: 'ADMIN', userId: actor.userId }, reason: 'Packing started', idempotencyKey: key });
  })(req);
}
