import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession, canAccessSeller } from '@/lib/auth';
import { generateNextProductId } from '@/lib/idGenerator';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !canAccessSeller(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    
    const code = await generateNextProductId();
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const imageUrls = Array.isArray(body.images) ? body.images : [];
    const mainImage = imageUrls.length > 0 ? imageUrls[0] : null;

    const product = await (prisma.product.create as any)({
      data: {
        code,
        slug,
        name: body.name,
        price: body.price,
        originalPrice: body.originalPrice,
        description: body.description,
        categoryId: body.categoryId,
        emoji: body.emoji || '📦',
        badge: body.badge,
        inStock: body.inStock,
        sellerId: session.userId, // Gắn ID người bán
        rating: 5, // Sản phẩm mới mặc định 5 sao
        reviews: 0,
        image: mainImage,
        images: {
          create: imageUrls.map((url: string) => ({ url })),
        },
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('[SELLER_PRODUCT_CREATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
