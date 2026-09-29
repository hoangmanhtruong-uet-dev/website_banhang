import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import { EmailVerificationService } from '@/lib/services/auth/email-verification.service';
import { EmailService } from '@/lib/services/notification/email.service';
import prisma from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity } from '@/lib/network/client-ip';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: max 3 requests per 15 minutes
    const identity = getRateLimitIdentity(request, `send-verification-${session.userId}`);
    const limiter = await rateLimit(identity, { windowMs: 15 * 60 * 1000, max: 3 });
    if (!limiter.success) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, isEmailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ error: 'Email đã được xác thực.' }, { status: 400 });
    }

    const token = await EmailVerificationService.createToken(session.userId);
    const sent = await EmailService.sendVerificationEmail(user.email, token);

    if (!sent) {
      return NextResponse.json({ error: 'Không thể gửi email, vui lòng thử lại sau.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã gửi email xác thực.' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
