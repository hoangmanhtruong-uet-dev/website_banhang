import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// Lấy danh sách địa chỉ
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const addresses = await prisma.address.findMany({
      where: { userId: session.userId },
      orderBy: { isDefault: 'desc' },
    });
    return NextResponse.json(addresses);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// Thêm địa chỉ mới
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Nếu đây là địa chỉ đầu tiên, đặt làm mặc định
    const count = await prisma.address.count({ where: { userId: session.userId } });

    const address = await prisma.address.create({
      data: {
        ...body,
        userId: session.userId,
        isDefault: count === 0,
      },
    });

    return NextResponse.json(address);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
