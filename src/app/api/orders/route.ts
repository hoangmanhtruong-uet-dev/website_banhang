import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { orderSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';

// GET /api/orders - Lấy danh sách đơn hàng (admin only)
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/orders - Tạo đơn hàng mới
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate thông tin giao hàng
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { items } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Giỏ hàng trống' }, { status: 400 });
    }

    // Lấy giá thực từ DB để tránh gian lận giá
    const productIds: string[] = items.map((item: {productId: string; quantity: number}) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Có sản phẩm không tồn tại' }, { status: 400 });
    }

    // Tính tổng tiền từ giá DB
    let total = 0;
    const orderItems = items.map((item: {productId: string; quantity: number}) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error('Product not found');
      const price = product.price;
      total += price * item.quantity;
      return { productId: item.productId, quantity: item.quantity, price };
    });

    // Tạo order + orderItems trong 1 transaction
    const order = await prisma.order.create({
      data: {
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone,
        shippingAddress: parsed.data.shippingAddress,
        paymentMethod: parsed.data.paymentMethod,
        total,
        status: 'pending',
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: { include: { product: true } },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
