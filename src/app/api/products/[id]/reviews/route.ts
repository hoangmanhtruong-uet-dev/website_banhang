import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { AuthenticationError, ValidationError } from '@/lib/errors';
import { createHandler } from '@/lib/api-handler';
import { z } from 'zod';

export const runtime = 'nodejs';

export const GET = createHandler(async (req: NextRequest, options?: { params: Promise<{ id: string }> }) => {
  const params = await options?.params;
  const productId = params?.id;
  if (!productId) throw new ValidationError('Missing productId');
  
  const reviews = await prisma.review.findMany({
    where: { productId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(reviews);
});

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const POST = createHandler(async (req: NextRequest, options?: { params: Promise<{ id: string }> }) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError('Bạn cần đăng nhập để đánh giá');

  const params = await options?.params;
  const productId = params?.id;
  if (!productId) throw new ValidationError('Missing productId');
  const body = reviewSchema.parse(await req.json());

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) throw new ValidationError('Sản phẩm không tồn tại');

  // Check if user has purchased this product (Optional rule, but good practice)
  // For demo, we just allow review if they have any completed order containing this product.
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      productId: productId,
      order: {
        userId: session.userId,
        status: { in: ['completed', 'delivered', 'paid'] }
      }
    }
  });

  if (!hasPurchased) {
    throw new ValidationError('Bạn phải mua sản phẩm này trước khi có thể đánh giá.');
  }

  // Create or update review
  const review = await prisma.review.upsert({
    where: {
      userId_productId: {
        userId: session.userId,
        productId,
      },
    },
    update: {
      rating: body.rating,
      comment: body.comment,
    },
    create: {
      rating: body.rating,
      comment: body.comment,
      userId: session.userId,
      productId,
    },
  });

  // Update product average rating (optimistically or in background)
  const allReviews = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { id: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: allReviews._avg.rating || 0,
      reviews: allReviews._count.id,
    },
  });

  return NextResponse.json({ message: 'Đánh giá của bạn đã được ghi nhận', review }, { status: 201 });
});
