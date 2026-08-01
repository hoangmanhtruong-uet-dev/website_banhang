import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ValidationError } from '@/lib/errors';
import prisma from '@/lib/db';
import { InventoryService } from '@/lib/services/inventory.service';
import { ORDER_STATUS, OrderStateService, type OrderStatus } from '@/lib/services/order-state.service';
import { FulfillmentService } from '@/lib/services/fulfillment.service';

const compatibilityTargets: Readonly<Record<string, OrderStatus>> = {
  confirmed: ORDER_STATUS.CONFIRMED, processing: ORDER_STATUS.CONFIRMED,
  packing: ORDER_STATUS.PACKING, shipped: ORDER_STATUS.SHIPPING, shipping: ORDER_STATUS.SHIPPING,
  delivered: ORDER_STATUS.DELIVERED, cancelled: ORDER_STATUS.CANCELLED,
  refund_pending: ORDER_STATUS.REFUND_PENDING,
};

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async (request: NextRequest) => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const requested = typeof body.status === 'string' ? body.status.toLowerCase() : '';
    const target = compatibilityTargets[requested];
    if (!target) throw new ValidationError('Unsupported order action');
    const key = request.headers.get('idempotency-key');
    if (!key) throw new ValidationError('Idempotency-Key header is required');
    const reason = typeof body.reason === 'string' ? body.reason : `Admin action: ${target}`;
    const metadata = { ...(typeof body.trackingNumber === 'string' ? { trackingNumber: body.trackingNumber } : {}), ...(typeof body.shippingProvider === 'string' ? { shippingProvider: body.shippingProvider } : {}) };
    if (target === ORDER_STATUS.CANCELLED) {
      await InventoryService.cancel(id, { type: 'ADMIN', userId: admin.userId }, key);
    } else if ([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKING, ORDER_STATUS.SHIPPING, ORDER_STATUS.DELIVERED].includes(target as never)) {
      await FulfillmentService.transitionOrderFulfillments({
        orderId: id,
        targetStatus: target as 'confirmed' | 'packing' | 'shipping' | 'delivered',
        actor: { type: 'ADMIN', userId: admin.userId },
        reason, metadata, idempotencyKey: key,
      });
    } else {
      await OrderStateService.transition({ orderId: id, targetStatus: target, actor: { type: 'ADMIN', userId: admin.userId }, reason, metadata, idempotencyKey: key });
    }
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });
    return NextResponse.json({ message: 'Order transition completed', order }, { headers: { Deprecation: 'true', Link: '</api/admin/orders/{id}/actions>; rel="successor-version"' } });
  })(req);
}
