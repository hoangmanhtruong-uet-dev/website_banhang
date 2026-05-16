import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSeller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    
    const product = await prisma.product.create({
      data: {
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
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('[SELLER_PRODUCT_CREATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
