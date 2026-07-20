import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await context.params;
    const { addQuantity } = await req.json();
    const qty = Number(addQuantity);

    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json({ error: 'Số lượng nhập phải là số nguyên không âm' }, { status: 400 });
    }

    if (qty === 0) {
      return NextResponse.json({ error: 'Nhập số lượng lớn hơn 0' }, { status: 400 });
    }

    const current = await prisma.product.findUnique({
      where: { id },
      select: { stockQuantity: true, name: true },
    });

    if (!current) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    }

    const newStock = current.stockQuantity + qty;

    const product = await prisma.product.update({
      where: { id },
      data: {
        stockQuantity: newStock,
        inStock: newStock > 0,
      },
      select: {
        id: true,
        code: true,
        name: true,
        emoji: true,
        stockQuantity: true,
        inStock: true,
      },
    });

    return NextResponse.json({
      message: `Đã nhập ${qty} cho "${current.name}". Tồn kho: ${newStock}`,
      product,
    });
  } catch (error) {
    console.error('[ADMIN_INVENTORY_PATCH]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
