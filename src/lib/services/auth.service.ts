import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { JWTPayload } from '@/lib/auth';
import { env } from '@/config/env';
import { createAuthCookieOptions } from '@/lib/auth-cookie';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export class AuthService {
  static async signAccessToken(payload: JWTPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.ACCESS_TOKEN_TTL)
      .sign(ACCESS_SECRET);
  }

  static async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      return payload as unknown as JWTPayload;
    } catch {
      return null;
    }
  }

  static setAuthCookies(
    response: NextResponse,
    accessToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) {
    response.cookies.set('auth-token', accessToken, createAuthCookieOptions(15 * 60));
    response.cookies.set(
      'refresh-token',
      refreshToken,
      createAuthCookieOptions(env.REFRESH_TOKEN_TTL, refreshExpiresAt),
    );
  }

  static async setAuthCookiesInStore(
    accessToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) {
    const cookieStore = await cookies();

    cookieStore.set('auth-token', accessToken, createAuthCookieOptions(15 * 60));
    cookieStore.set(
      'refresh-token',
      refreshToken,
      createAuthCookieOptions(env.REFRESH_TOKEN_TTL, refreshExpiresAt),
    );
  }

  static setUserRoleCookie(response: NextResponse, role: string, refreshExpiresAt: Date) {
    response.cookies.set('user-role', role, {
      ...createAuthCookieOptions(env.REFRESH_TOKEN_TTL, refreshExpiresAt),
      httpOnly: false,
    });
  }

  static clearAuthCookies(response: NextResponse) {
    const expired = createAuthCookieOptions(0, new Date(0));
    response.cookies.set('auth-token', '', expired);
    response.cookies.set('refresh-token', '', expired);
    response.cookies.set('user-role', '', { ...expired, httpOnly: false });
  }

  static async clearAuthCookiesInStore() {
    const cookieStore = await cookies();
    const expired = createAuthCookieOptions(0, new Date(0));
    cookieStore.set('auth-token', '', expired);
    cookieStore.set('refresh-token', '', expired);
    cookieStore.set('user-role', '', { ...expired, httpOnly: false });
  }
}