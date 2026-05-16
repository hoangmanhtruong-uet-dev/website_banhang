import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { isSeller: true },
    });

    return NextResponse.json({ message: 'Đăng ký bán hàng thành công', user });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
