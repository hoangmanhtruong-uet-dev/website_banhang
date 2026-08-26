import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/lib/services/session.service';
import { AuthService } from '@/lib/services/auth.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit';
import { getRateLimitIdentity, getTrustedClientIp } from '@/lib/client-ip';

export async function POST(req: Request) {
  try {
    const limiter = await rateLimit(getRateLimitIdentity(req, 'refresh'), { windowMs: 15 * 60 * 1000, max: 10 });
    if (!limiter.success) {
      return getRateLimitResponse(limiter);
    }

    const cookieStore = await cookies();
    const oldRefreshToken = cookieStore.get('refresh-token')?.value;

    if (!oldRefreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = getTrustedClientIp(req);

    const result = await SessionService.refreshSession(oldRefreshToken, userAgent, ipAddress);

    if (!result) {
      const response = NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
      AuthService.clearAuthCookies(response);
      return response;
    }

    const { refreshToken, expiresAt, user } = result;

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isSeller: user.isSeller,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Token refreshed',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isSeller: user.isSeller },
    });

    AuthService.setAuthCookies(response, accessToken, refreshToken, expiresAt);
    AuthService.setUserRoleCookie(response, user.role, expiresAt);

    return response;
  } catch (error) {
    console.error('[REFRESH]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}