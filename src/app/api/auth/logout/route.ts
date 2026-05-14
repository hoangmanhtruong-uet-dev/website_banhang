import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Đăng xuất thành công' });
  response.cookies.delete('auth-token');
  response.cookies.delete('user-role');
  return response;
}
