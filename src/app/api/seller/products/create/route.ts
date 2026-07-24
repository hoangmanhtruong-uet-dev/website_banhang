import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';
import { generateNextProductId } from '@/lib/idGenerator';
import { productSchema } from '@/lib/validations';
import { serializeMoneyFields } from '@/lib/utils/money';

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
    const imageUrls = Array.isArray(raw.images) ? raw.images.filter((url): url is string => typeof url === 'string') : [];
    const product = await prisma.product.create({ data: {
      code, slug, name: input.name, price: input.price, originalPrice: input.originalPrice ?? null,
      currency: input.currency, description: input.description, categoryId: input.categoryId,
      emoji: typeof raw.emoji === 'string' ? raw.emoji : '📦', badge: typeof raw.badge === 'string' ? raw.badge : null,
      inStock: typeof raw.inStock === 'boolean' ? raw.inStock : true, sellerId: session.userId,
      rating: 5, reviews: 0, image: imageUrls[0] ?? input.image ?? null,
      images: { create: imageUrls.map((url) => ({ url })) },
    }, include: { images: true } });
    return NextResponse.json(serializeMoneyFields(product));
  } catch (error) {
    console.error('[SELLER_PRODUCT_CREATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
