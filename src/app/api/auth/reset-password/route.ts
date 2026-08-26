import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PasswordResetService } from '@/lib/services/password-reset.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { PasswordService } from '@/lib/services/password.service';
import { z } from 'zod';
import { getRateLimitIdentity } from '@/lib/client-ip';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export async function POST(req: Request) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(req, 'reset-password'), { windowMs: 15 * 60 * 1000, max: 5 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter);
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const user = await PasswordResetService.verifyAndUseToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 400 });
    }

    const hashedPassword = await PasswordService.hash(password);

    // Update password and revoke all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      // Revoke all active sessions for this user
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) {
    console.error('[RESET_PASSWORD]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}