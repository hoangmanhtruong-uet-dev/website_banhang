import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { AuthService } from '@/lib/services/auth.service';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { isSeller: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSeller: true,
      },
    });

    const token = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isSeller: user.isSeller,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Đăng ký bán hàng thành công',
      user,
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('user-role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[SELLER_REGISTER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
