import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PasswordResetService } from '@/lib/services/password-reset.service';
import { EmailService } from '@/lib/services/email.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const limiter = await rateLimit(`forgot-password:${ip}`, { windowMs: 15 * 60 * 1000, max: 3 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter.reset);
    }

    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to avoid email enumeration
    if (!user) {
      return NextResponse.json({ message: 'Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi.' });
    }

    const token = await PasswordResetService.createToken(user.id);
    
    // Send email (non-blocking or with timeout)
    try {
      await EmailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      console.error('[FORGOT_PASSWORD_EMAIL]', error);
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({ message: 'Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi.' });
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}