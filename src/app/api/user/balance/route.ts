import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/user/balance — Lấy số dư hiện tại
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ balance: user.balance });
  } catch (error) {
    console.error('[GET /api/user/balance]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/user/balance — Cập nhật số dư (simulator / admin)
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { balance } = body;

    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: 'Số dư không hợp lệ' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { balance },
      select: { balance: true },
    });

    return NextResponse.json({ balance: updated.balance });
  } catch (error) {
    console.error('[PATCH /api/user/balance]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
