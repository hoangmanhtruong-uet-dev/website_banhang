import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.userId },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(serializeMoneyFields(orders));
  } catch (error) {
    console.error('[GET /api/me/orders]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
