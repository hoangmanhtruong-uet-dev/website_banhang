import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { authenticator } from 'otplib';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Mã token không hợp lệ' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { twoFactorSecret: true, isTwoFactorEnabled: true },
    });

    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu cấu hình 2FA' }, { status: 400 });
    }

    if (user.isTwoFactorEnabled) {
      return NextResponse.json({ error: '2FA đã được bật từ trước' }, { status: 400 });
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

    if (!isValid) {
      return NextResponse.json({ error: 'Mã xác thực không chính xác' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { isTwoFactorEnabled: true },
    });

    return NextResponse.json({ success: true, message: 'Đã bật 2FA thành công' });
  } catch (error) {
    console.error('[2FA_VERIFY]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
