import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.isSeller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      where: { sellerId: session.userId },
      include: { categoryRef: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
