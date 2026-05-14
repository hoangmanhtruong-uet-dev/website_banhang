import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Bảo vệ route admin - verify JWT thực
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      // Token không hợp lệ hoặc hết hạn
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete('auth-token');
      res.cookies.delete('user-role');
      return res;
    }
  }

  // Bảo vệ route checkout - yêu cầu đăng nhập
  if (pathname.startsWith('/checkout')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login?from=/checkout', request.url));
    }
    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.redirect(new URL('/login?from=/checkout', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/checkout/:path*'],
};