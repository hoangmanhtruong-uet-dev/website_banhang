import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import prisma from '@/lib/db';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, isTwoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
    }

    if (user.isTwoFactorEnabled) {
      return NextResponse.json({ error: '2FA đã được bật' }, { status: 400 });
    }

    const secret = authenticator.generateSecret();
    const appName = 'MTRUONG STORE';
    const otpAuthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrUrl = await QRCode.toDataURL(otpAuthUrl);

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorSecret: secret },
    });

    return NextResponse.json({ qrUrl, secret });
  } catch (error) {
    console.error('[2FA_GENERATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
