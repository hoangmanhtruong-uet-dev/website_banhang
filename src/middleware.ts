import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
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

  // Bảo vệ route checkout - yêu cầu đăng nhập
  if (pathname.startsWith('/checkout')) {
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
  matcher: ['/admin/:path*', '/profile/:path*', '/seller/:path*', '/checkout/:path*'],
};
