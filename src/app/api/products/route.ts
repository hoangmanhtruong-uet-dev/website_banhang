import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { productSchema } from '@/lib/validations';
import { getSession } from '@/lib/auth';

// GET /api/products - Lấy danh sách sản phẩm (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    const where: {category?: string; name?: {contains: string}} = {};
    if (category && category !== 'Tất cả') where.category = category;
    if (search) where.name = { contains: search };

    const validSortFields = ['price', 'rating', 'name', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const products = await prisma.product.findMany({
      where,
      orderBy: { [sortField]: order as 'asc' | 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Lỗi khi lấy danh sách sản phẩm' }, { status: 500 });
  }
}

// POST /api/products - Tạo sản phẩm mới (admin only)
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        price: body.price,
        originalPrice: body.originalPrice ?? null,
        description: body.description,
        category: body.category,
        emoji: body.emoji ?? '📦',
        gradient: body.gradient ?? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        badge: body.badge ?? null,
        rating: body.rating ?? 0,
        reviews: body.reviews ?? 0,
        inStock: body.inStock ?? true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}