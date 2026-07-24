import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { productSchema } from '@/lib/validations';
import { serializeMoneyFields } from '@/lib/utils/money';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
    if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    return NextResponse.json(serializeMoneyFields(product));
  } catch (error) {
    console.error('[GET /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    if (session.role !== 'admin' && existingProduct.sellerId !== session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const raw = await req.json() as Record<string, unknown>;
    const parsed = productSchema.partial().safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const input = parsed.data;
    const updateData: Prisma.ProductUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.originalPrice !== undefined ? { originalPrice: input.originalPrice } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryRef: { connect: { id: input.categoryId } } } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
    };
    if (raw.images !== undefined) {
      const imageUrls = Array.isArray(raw.images) ? raw.images.filter((url): url is string => typeof url === 'string') : [];
      updateData.image = imageUrls[0] ?? null;
      updateData.images = { deleteMany: {}, create: imageUrls.map((url) => ({ url })) };
    }
    const product = await prisma.product.update({ where: { id }, data: updateData, include: { images: true } });
    return NextResponse.json(serializeMoneyFields(product));
  } catch (error) {
    console.error('[PUT /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    if (session.role !== 'admin' && existingProduct.sellerId !== session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    console.error('[DELETE /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
