import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { productBaseSchema } from '@/lib/validations';
import { Money, serializeMoneyFields } from '@/lib/utils/money';
import { getCategoryProductImage } from '@/lib/product-image';
import { claimProductUploads, normalizeProductImageUrls, UploadAssetAuthorizationError, UploadAssetValidationError } from '@/lib/services/upload-asset.service';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: { images: true, categoryRef: true } });
    if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    return NextResponse.json(serializeMoneyFields({ ...product, category: product.categoryRef?.name ?? '', image: product.image || product.images[0]?.url || getCategoryProductImage(product.categoryRef?.name) }));
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
    const existingProduct = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: { images: true } });
    if (!existingProduct) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    if (session.role !== 'admin' && existingProduct.sellerId !== session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const raw = await req.json() as Record<string, unknown>;
    const parsed = productBaseSchema.partial().safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const input = parsed.data;
    const imageUrls = raw.images !== undefined ? normalizeProductImageUrls(raw.images) : undefined;
    const existingImageUrls = new Set([
      ...(existingProduct.image ? [existingProduct.image] : []),
      ...existingProduct.images.map((image) => image.url),
    ]);
    const claimImageUrls = imageUrls
      ?? (typeof input.image === 'string' && input.image.trim() ? normalizeProductImageUrls([input.image]) : []);
    const nextPrice = input.price ?? existingProduct.price;
    const nextOriginalPrice = input.originalPrice !== undefined ? input.originalPrice : existingProduct.originalPrice;
    if (nextOriginalPrice && Money.compare(nextOriginalPrice, nextPrice) <= 0) return NextResponse.json({ error: 'Giá gốc phải lớn hơn giá bán' }, { status: 400 });
    const updateData: Prisma.ProductUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.originalPrice !== undefined ? { originalPrice: input.originalPrice } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryRef: { connect: { id: input.categoryId } } } : {}),
      ...(input.image !== undefined ? { image: input.image } : {}),
      ...(typeof raw.inStock === 'boolean' ? { inStock: raw.inStock } : {}),
      ...(typeof raw.stockQuantity === 'number' && Number.isInteger(raw.stockQuantity) && raw.stockQuantity >= 0 ? { stockQuantity: raw.stockQuantity, inStock: raw.stockQuantity > 0 } : {}),
    };
    if (imageUrls !== undefined) {
      updateData.image = imageUrls[0] ?? null;
      updateData.images = { deleteMany: {}, create: imageUrls.map((url) => ({ url })) };
    }
    const product = await prisma.$transaction(async (tx) => {
      if (claimImageUrls.length > 0) {
        await claimProductUploads(tx, session.userId, id, claimImageUrls, existingImageUrls);
      }
      return tx.product.update({ where: { id }, data: updateData, include: { images: true } });
    });
    return NextResponse.json(serializeMoneyFields(product));
  } catch (error) {
    if (error instanceof UploadAssetAuthorizationError || error instanceof UploadAssetValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[PUT /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existingProduct = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existingProduct) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    if (session.role !== 'admin' && existingProduct.sellerId !== session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), deletedById: session.userId, inStock: false } });
    return NextResponse.json({ message: 'Đã ẩn sản phẩm khỏi hệ thống' });
  } catch (error) {
    console.error('[DELETE /api/products/[id]]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}