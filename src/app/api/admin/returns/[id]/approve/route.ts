import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/errors';
import prisma from '@/lib/db';
import { ORDER_STATUS, OrderStateService } from '@/lib/services/order-state.service';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const actor = await requireAdmin(); const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const record = await prisma.orderReturn.findUniqueOrThrow({ where: { id: (await context.params).id } });
    return OrderStateService.transition({ orderId: record.orderId, targetStatus: ORDER_STATUS.RETURN_APPROVED, actor: { type: 'ADMIN', userId: actor.userId }, reason: 'Return approved', idempotencyKey: key });
  })(req);
}
