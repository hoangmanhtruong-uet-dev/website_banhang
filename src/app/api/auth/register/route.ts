import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { generateNextUserId } from '@/lib/idGenerator';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate với Zod
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Kiểm tra email đã tồn tại
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate code
    const code = await generateNextUserId('user');

    // Tạo user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'user', code },
    });

    // Tạo JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isSeller: user.isSeller,
    });

    const response = NextResponse.json(
      { message: 'Đăng ký thành công', user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 ngày
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[REGISTER]', error);
    return NextResponse.json({ 
      error: 'Lỗi server', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
