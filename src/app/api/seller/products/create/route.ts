import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';
import { generateNextProductId } from '@/lib/idGenerator';
import { productSchema } from '@/lib/validations';
import { serializeMoneyFields } from '@/lib/utils/money';
import { claimProductUploads, normalizeProductImageUrls, UploadAssetAuthorizationError, UploadAssetValidationError } from '@/lib/services/upload-asset.service';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !canAccessSeller(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const raw = await req.json() as Record<string, unknown>;
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const input = parsed.data;
    const code = await generateNextProductId();
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const imageUrls = normalizeProductImageUrls(
      raw.images ?? (typeof input.image === 'string' && input.image.trim() ? [input.image] : []),
    );
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: {
      code, sku: input.sku ?? `SKU-${code}`, slug, name: input.name, price: input.price, originalPrice: input.originalPrice ?? null,
      currency: input.currency, description: input.description, categoryId: input.categoryId,
      emoji: typeof raw.emoji === 'string' ? raw.emoji : '📦', badge: typeof raw.badge === 'string' ? raw.badge : null,
      stockQuantity: typeof raw.stockQuantity === 'number' && Number.isInteger(raw.stockQuantity) && raw.stockQuantity >= 0 ? raw.stockQuantity : 0,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      inStock: typeof raw.stockQuantity === 'number' ? raw.stockQuantity > 0 : (typeof raw.inStock === 'boolean' ? raw.inStock : false), sellerId: session.userId,
      rating: 5, reviews: 0, image: imageUrls[0] ?? input.image ?? null,
      images: { create: imageUrls.map((url) => ({ url })) },
      }, include: { images: true } });
      await claimProductUploads(tx, session.userId, created.id, imageUrls);
      return created;
    });
    return NextResponse.json(serializeMoneyFields(product));
  } catch (error) {
    if (error instanceof UploadAssetAuthorizationError || error instanceof UploadAssetValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('[SELLER_PRODUCT_CREATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
