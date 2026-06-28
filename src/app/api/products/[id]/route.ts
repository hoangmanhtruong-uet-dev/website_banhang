import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id] - Lấy chi tiết sản phẩm
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const product = await (prisma.product.findUnique as any)({ 
      where: { id },
      include: { images: true }
    });
    if (!product) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error('[GET /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/products/[id] - Cập nhật sản phẩm
export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Tìm sản phẩm hiện tại để kiểm tra quyền sở hữu
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    }

    const isAdmin = session.role === 'admin';
    const isOwner = existingProduct.sellerId === session.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();

    const updateData: any = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.originalPrice !== undefined && { originalPrice: body.originalPrice }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.badge !== undefined && { badge: body.badge }),
      ...(body.rating !== undefined && { rating: body.rating }),
      ...(body.reviews !== undefined && { reviews: body.reviews }),
      ...(body.inStock !== undefined && { inStock: body.inStock }),
    };

    if (body.images !== undefined) {
      const imageUrls = Array.isArray(body.images) ? body.images : [];
      const mainImage = imageUrls.length > 0 ? imageUrls[0] : null;

      // Xóa ảnh cũ
      await (prisma as any).productImage.deleteMany({ where: { productId: id } });

      updateData.image = mainImage;
      updateData.images = {
        create: imageUrls.map((url: string) => ({ url })),
      };
    }

    const product = await (prisma.product.update as any)({
      where: { id },
      data: updateData,
      include: {
        images: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('[PUT /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Xóa sản phẩm
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Tìm sản phẩm hiện tại để kiểm tra quyền sở hữu
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    }

    const isAdmin = session.role === 'admin';
    const isOwner = existingProduct.sellerId === session.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    console.error('[DELETE /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
