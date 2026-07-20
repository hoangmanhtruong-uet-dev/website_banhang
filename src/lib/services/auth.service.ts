import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { JWTPayload } from '@/lib/auth';
import { env } from '@/config/env';

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

  private static cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge,
      path: '/',
    };
  }

  static setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
    response.cookies.set('auth-token', accessToken, this.cookieOptions(15 * 60));
    response.cookies.set('refresh-token', refreshToken, this.cookieOptions(30 * 24 * 60 * 60));
  }

  static async setAuthCookiesInStore(accessToken: string, refreshToken: string) {
    const cookieStore = await cookies();

    cookieStore.set('auth-token', accessToken, this.cookieOptions(15 * 60));
    cookieStore.set('refresh-token', refreshToken, this.cookieOptions(30 * 24 * 60 * 60));
  }

  static clearAuthCookies(response: NextResponse) {
    const expired = this.cookieOptions(0);
    response.cookies.set('auth-token', '', expired);
    response.cookies.set('refresh-token', '', expired);
    response.cookies.set('user-role', '', { ...expired, httpOnly: false });
  }

  static async clearAuthCookiesInStore() {
    const cookieStore = await cookies();
    const expired = this.cookieOptions(0);
    cookieStore.set('auth-token', '', expired);
    cookieStore.set('refresh-token', '', expired);
    cookieStore.set('user-role', '', { ...expired, httpOnly: false });
  }
}