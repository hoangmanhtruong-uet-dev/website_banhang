import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const banks = await prisma.bankInfo.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(banks);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const bank = await prisma.bankInfo.create({
      data: {
        ...body,
        userId: session.userId,
      },
    });

    return NextResponse.json(bank);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
