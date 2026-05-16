import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const voucher = await (prisma as any).voucher.create({
      data: {
        ...body,
        sellerId: session.userId, // Admin tạo thì gắn ID admin
        endDate: new Date(body.endDate),
      }
    });

    return NextResponse.json(voucher);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const vouchers = await (prisma as any).voucher.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(vouchers);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
