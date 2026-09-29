import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { registerSchema } from '@/lib/validations';
import { generateNextUserId } from '@/lib/idGenerator';
import { AuthService } from '@/lib/services/auth/auth.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { PasswordService } from '@/lib/services/auth/password.service';
import { getRateLimitIdentity, getTrustedClientIp } from '@/lib/network/client-ip';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(req, 'register'), { windowMs: 60 * 60 * 1000, max: 3 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter);
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

    // Generate and send email verification token asynchronously
    try {
      const { EmailVerificationService } = await import('@/lib/services/auth/email-verification.service');
      const { EmailService } = await import('@/lib/services/notification/email.service');
      const token = await EmailVerificationService.createToken(user.id);
      await EmailService.sendVerificationEmail(user.email, token);
    } catch (verifyError) {
      console.error('Failed to send verification email on register:', verifyError);
    }

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isSeller: user.isSeller,
    });

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = getTrustedClientIp(req);

    const { refreshToken, expiresAt } = await SessionService.createSession(user.id, userAgent, ipAddress);

    const response = NextResponse.json(
      { message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.', user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );

    AuthService.setAuthCookies(response, accessToken, refreshToken, expiresAt);
    AuthService.setUserRoleCookie(response, user.role, expiresAt);

    return response;
  } catch (error) {
    console.error('[REGISTER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}