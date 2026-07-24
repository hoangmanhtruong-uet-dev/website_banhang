import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      orderBy: { stockQuantity: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        emoji: true,
        stockQuantity: true,
        inStock: true,
        price: true,
        categoryRef: { select: { name: true } },
      },
    });

    const lowStock = products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length;
    const outOfStock = products.filter(p => p.stockQuantity <= 0).length;

    return NextResponse.json(
      serializeMoneyFields({
        products,
        stats: {
          totalSku: products.length,
          lowStock,
          outOfStock,
        },
      }),
      { headers: { 'Cache-Control': 'no-store, no-cache' } }
    );
  } catch (error) {
    console.error('[ADMIN_INVENTORY_GET]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
