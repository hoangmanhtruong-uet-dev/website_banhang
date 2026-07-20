import { NextRequest } from 'next/server';
import { orderSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';
import { OrderService } from '@/lib/services/order.service';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';

// GET /api/orders - Lấy danh sách đơn hàng
export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  return await OrderService.getOrders(session.userId, session.role);
});

// POST /api/orders - Tạo đơn hàng mới
export const POST = createHandler(async (req: NextRequest) => {
  const body = await req.json();
  const session = await getSession();

  const parsed = orderSchema.parse(body);

  return await OrderService.createOrder({
    ...parsed,
    userId: session?.userId,
    items: body.items,
  });
});
