import { NextResponse } from 'next/server';
import { EmailVerificationService } from '@/lib/services/auth/email-verification.service';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Mã xác thực không hợp lệ.' }, { status: 400 });
    }

    const user = await EmailVerificationService.verifyAndUseToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Xác thực email thành công.' });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
