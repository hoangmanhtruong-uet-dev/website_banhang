import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { createHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';

export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const wishlists = await prisma.wishlist.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          originalPrice: true,
          image: true,
          emoji: true,
          gradient: true,
          inStock: true,
          rating: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(wishlists);
});

const wishlistSchema = z.object({
  productId: z.string().min(1),
});

export const POST = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const body = wishlistSchema.parse(await req.json());
  
  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: { id: true }
  });

  if (!product) {
    throw new ValidationError('Sản phẩm không tồn tại');
  }

  try {
    const item = await prisma.wishlist.create({
      data: {
        userId: session.userId,
        productId: body.productId,
      },
    });
    return NextResponse.json({ message: 'Đã thêm vào danh sách yêu thích', item }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Sản phẩm đã có trong danh sách yêu thích' }, { status: 200 });
    }
    throw error;
  }
});

export const DELETE = createHandler(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();

  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');

  if (!productId) {
    throw new ValidationError('Thiếu productId');
  }

  await prisma.wishlist.deleteMany({
    where: {
      userId: session.userId,
      productId: productId,
    },
  });

  return NextResponse.json({ message: 'Đã xóa khỏi danh sách yêu thích' });
});
