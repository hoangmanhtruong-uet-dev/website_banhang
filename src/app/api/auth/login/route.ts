import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { loginSchema } from '@/lib/validations';
import { AuthService } from '@/lib/services/auth.service';
import { SessionService } from '@/lib/services/session.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { PasswordService } from '@/lib/services/password.service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const limiter = await rateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter.reset);
    }

    const body = await req.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const passwordMatch = await PasswordService.verify(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isSeller: user.isSeller,
      name: user.name,
    });

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || undefined;

    const { refreshToken } = await SessionService.createSession(user.id, userAgent, ipAddress);

    const response = NextResponse.json({
      message: 'Đăng nhập thành công',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isSeller: user.isSeller },
    });

    AuthService.setAuthCookies(response, accessToken, refreshToken);
    
    // Set role cookie (non-httpOnly for client-side middleware/logic if needed)
    response.cookies.set('user-role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[LOGIN]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}