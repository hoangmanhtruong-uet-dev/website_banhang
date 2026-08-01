import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { env } from '@/config/env';

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

  // CSRF Protection for non-GET requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    if (origin) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    } else if (referer) {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return NextResponse.json({ error: 'Invalid referer' }, { status: 403 });
      }
    }
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
  matcher: ['/admin/:path*', '/profile/:path*', '/seller/:path*', '/shipper/:path*', '/cart/:path*', '/checkout/:path*'],
};
