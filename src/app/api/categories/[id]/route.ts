import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// PUT /api/categories/[id] - Cập nhật danh mục (admin only)
export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description } = body;

    const data: any = {};
    if (name !== undefined) {
      data.name = name;
      data.slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    if (description !== undefined) {
      data.description = description;
    }
    // Allow admin to mark category as approved
    if (body.approved !== undefined) {
      data.approved = !!body.approved;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('[PUT /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] - Xóa danh mục (admin only)
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Trước khi xóa, hãy ngắt liên kết các sản phẩm thuộc danh mục này
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Xóa danh mục thành công' });
  } catch (error) {
    console.error('[DELETE /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
