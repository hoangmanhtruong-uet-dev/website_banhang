import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { generateNextUserId } from '@/lib/idGenerator';
import { AuthService } from '@/lib/services/auth.service';
import { SessionService } from '@/lib/services/session.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { PasswordService } from '@/lib/services/password.service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const limiter = await rateLimit(`register:${ip}`, { windowMs: 60 * 60 * 1000, max: 3 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter.reset);
    }

    const body = await req.json();

    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    const hashedPassword = await PasswordService.hash(password);
    const code = await generateNextUserId('user');

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'user', code },
    });

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isSeller: user.isSeller,
    });

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || undefined;

    const { refreshToken } = await SessionService.createSession(user.id, userAgent, ipAddress);

    const response = NextResponse.json(
      { message: 'Đăng ký thành công', user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );

    AuthService.setAuthCookies(response, accessToken, refreshToken);
    response.cookies.set('user-role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[REGISTER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}