import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id] - Lấy chi tiết sản phẩm
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error('[GET /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/products/[id] - Cập nhật sản phẩm (admin only)
export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        price: body.price,
        originalPrice: body.originalPrice ?? null,
        description: body.description,
        category: body.category,
        emoji: body.emoji,
        gradient: body.gradient,
        badge: body.badge ?? null,
        rating: body.rating,
        reviews: body.reviews,
        inStock: body.inStock,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('[PUT /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Xóa sản phẩm (admin only)
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    console.error('[DELETE /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
