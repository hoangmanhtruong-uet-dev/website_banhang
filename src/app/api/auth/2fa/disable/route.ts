import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });

    return NextResponse.json({ success: true, message: 'Đã tắt 2FA thành công' });
  } catch (error) {
    console.error('[2FA_DISABLE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
