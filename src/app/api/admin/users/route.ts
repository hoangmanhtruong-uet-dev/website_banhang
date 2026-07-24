import { NextResponse } from 'next/server';
import { serializeMoneyFields } from '@/lib/utils/money';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isSeller: true,
        phone: true,
        gender: true,
        birthday: true,
        avatar: true,
        licensePlate: true,
        transportType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(serializeMoneyFields(users));
  } catch (error) {
    console.error('[GET /api/admin/users]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        code: `AD${Math.floor(Math.random() * 900) + 100}`,
        name,
        email,
        password: hashedPassword,
        role: role || 'admin',
      },
    });

    return NextResponse.json(serializeMoneyFields(user), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Email đã tồn tại hoặc lỗi hệ thống' }, { status: 400 });
  }
}