import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { ORDER_STATUS, OrderStateService } from '@/lib/services/order-state.service';
const schema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const session = await getSession();
    if (!session) throw new AuthenticationError();
    const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const { reason } = schema.parse(await request.json());
    return OrderStateService.transition({ orderId: (await context.params).id, targetStatus: ORDER_STATUS.RETURN_REQUESTED, actor: { type: 'CUSTOMER', userId: session.userId }, reason, idempotencyKey: key });
  })(req);
}
