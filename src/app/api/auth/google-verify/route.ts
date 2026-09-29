import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import prisma from '@/lib/db';
import { AuthService } from '@/lib/services/auth/auth.service';
import { SessionService } from '@/lib/services/auth/session.service';
import { generateNextUserId } from '@/lib/idGenerator';
import { PasswordService } from '@/lib/services/auth/password.service';
import { rateLimit, getRateLimitResponse } from '@/lib/rate-limit/rate-limit';
import { getRateLimitIdentity, getTrustedClientIp } from '@/lib/network/client-ip';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Rate limit: 10 req/15 phút per IP
    const limiter = await rateLimit(getRateLimitIdentity(request, 'google-verify'), { windowMs: 15 * 60 * 1000, max: 10 });
    if (!limiter.success) return getRateLimitResponse(limiter);

    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // 1. Xác thực token với Supabase
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(access_token);
    if (error || !supabaseUser) {
      console.error('Lỗi khi verify Supabase token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = supabaseUser.email;
    const name = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || 'Người dùng Google';
    const avatar = supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // 2. Upsert user trong DB
    let user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      try {
        const randomPassword = await PasswordService.hash(`google-oauth-${crypto.randomUUID()}-${Date.now()}`);
        const code = await generateNextUserId('user');
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: randomPassword,
            code,
            role: 'user',
            ...(avatar ? { avatar } : {}),
          },
        });
      } catch (createError: unknown) {
        if ((createError as { code?: string })?.code === 'P2002') {
          user = await prisma.user.findFirst({ where: { email } });
          if (!user) throw createError;
        } else {
          throw createError;
        }
      }
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' }, { status: 403 });
    }

    // 3. Tạo access token
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
    const isSeller = sellerProfile?.status === 'APPROVED';

    const accessToken = await AuthService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      isSeller,
      name: user.name,
    });

    // 4. Tạo session đúng chuẩn (lưu DB, có thể revoke)
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = getTrustedClientIp(request);
    const { refreshToken, expiresAt } = await SessionService.createSession(user.id, userAgent, ipAddress);

    // 5. Set cookies
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    AuthService.setAuthCookies(response, accessToken, refreshToken, expiresAt);
    AuthService.setUserRoleCookie(response, user.role, expiresAt);

    return response;
  } catch (error) {
    console.error('Lỗi Google Login:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
