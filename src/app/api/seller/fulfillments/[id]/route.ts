import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession, canAccessSeller } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ValidationError } from '@/lib/errors';
import { FulfillmentService } from '@/lib/services/fulfillment.service';

const bodySchema = z.object({
  action: z.enum(['confirm', 'pack']),
  reason: z.string().trim().max(500).optional(),
}).strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const { id } = await context.params;
    const input = bodySchema.parse(await request.json());
    return FulfillmentService.transition({
      fulfillmentId: id,
      targetStatus: input.action === 'confirm' ? 'confirmed' : 'packing',
      actor: { type: 'SELLER', userId: session.userId },
      reason: input.reason ?? `Seller action: ${input.action}`,
      idempotencyKey: key,
    });
  })(req);
}
