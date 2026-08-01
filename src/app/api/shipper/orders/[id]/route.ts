import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ValidationError } from '@/lib/errors';
import { FulfillmentService } from '@/lib/services/fulfillment.service';

const bodySchema = z.object({
  status: z.enum(['SHIPPING', 'DELIVERED']),
  trackingNumber: z.string().trim().min(1).max(191).optional(),
  shippingProvider: z.string().trim().min(1).max(191).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  assignSelf: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
}).strict();

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const session = await getSession();
    if (!session || session.role !== 'shipper') throw new AuthorizationError('Shipper access required');
    const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const { id } = await context.params;
    const input = bodySchema.parse(await request.json());
    const targetStatus = input.status === 'DELIVERED' ? 'delivered' : 'shipping';
    return FulfillmentService.transition({
      fulfillmentId: id,
      targetStatus,
      actor: { type: 'SHIPPER', userId: session.userId },
      reason: input.reason ?? `Shipper action: ${targetStatus}`,
      metadata: {
        ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
        ...(input.shippingProvider ? { shippingProvider: input.shippingProvider } : {}),
        ...(input.estimatedDelivery ? { estimatedDelivery: input.estimatedDelivery } : {}),
        ...(input.assignSelf ? { assignSelf: true } : {}),
      },
      idempotencyKey: key,
    });
  })(req);
}
