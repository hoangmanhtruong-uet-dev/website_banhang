import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/lib/services/session.service';
import { AuthService } from '@/lib/services/auth.service';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh-token')?.value;

    if (refreshToken) {
      await SessionService.revokeSession(refreshToken);
    }

    const response = NextResponse.json({ message: 'Đăng xuất thành công' });
    AuthService.clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('[LOGOUT]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}