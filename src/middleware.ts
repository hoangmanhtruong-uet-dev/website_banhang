import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { validateApiMutationOrigin } from '@/lib/security/origin-policy';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, ACCESS_SECRET);
  return payload;
}

function redirectToLogin(request: NextRequest, fromPath: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', fromPath);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.delete('auth-token');
  res.cookies.delete('user-role');
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Cookie-authenticated browser mutations require this independently of CORS.
  const originDecision = validateApiMutationOrigin({
    method: request.method,
    pathname,
    url: request.url,
    headers: request.headers,
  }, {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
    TRUST_PROXY: process.env.TRUST_PROXY,
  });
  if (!originDecision.allowed) {
    logger.warn('security.api_origin_rejected', {
      method: request.method,
      pathname,
      code: originDecision.code,
    });
    return NextResponse.json({
      error: { code: originDecision.code, message: originDecision.message },
    }, { status: originDecision.status });
  }

  // Bảo vệ route admin - verify JWT thực
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const payload = await verifyAuthToken(token);
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return redirectToLogin(request, pathname);
    }
  }

  // Bảo vệ profile - yêu cầu đăng nhập
  if (pathname.startsWith('/profile')) {
    if (!token) {
      return redirectToLogin(request, pathname);
    }
    try {
      await verifyAuthToken(token);
    } catch {
      return redirectToLogin(request, pathname);
    }
  }

  // Bảo vệ seller - đăng nhập + phải là người bán
  if (pathname.startsWith('/seller')) {
    if (!token) {
      return redirectToLogin(request, pathname);
    }
    try {
      const payload = await verifyAuthToken(token);
      if (!payload.isSeller && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/profile?needSeller=1', request.url));
      }
    } catch {
      return redirectToLogin(request, pathname);
    }
  }
  // Bảo vệ shipper - đăng nhập + đúng vai trò giao hàng
  if (pathname.startsWith('/shipper')) {
    if (!token) {
      return redirectToLogin(request, pathname);
    }
    try {
      const payload = await verifyAuthToken(token);
      if (payload.role !== 'shipper') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return redirectToLogin(request, pathname);
    }
  }


  // Bảo vệ route checkout - yêu cầu đăng nhập
  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) {
    if (!token) {
      return redirectToLogin(request, pathname);
    }
    try {
      await verifyAuthToken(token);
    } catch {
      return redirectToLogin(request, pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/profile/:path*', '/seller/:path*', '/shipper/:path*', '/cart/:path*', '/checkout/:path*'],
};
