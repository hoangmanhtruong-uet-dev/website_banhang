import { type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import prisma from '@/lib/db';
import { InventoryService } from '@/lib/services/inventory.service';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const session = await getSession();
    if (!session) throw new AuthenticationError();
    const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const { id } = await context.params;
    await InventoryService.cancel(id, { type: 'CUSTOMER', userId: session.userId }, key);
    return prisma.order.findFirstOrThrow({ where: { id, userId: session.userId } });
  })(req);
}
