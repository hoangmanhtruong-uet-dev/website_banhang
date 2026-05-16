import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { role } = await req.json();
    const validRoles = ['user', 'admin', 'editor', 'sale', 'warehouse'];
    
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role },
    });

    return NextResponse.json({ message: 'Cập nhật vai trò thành công', user });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
