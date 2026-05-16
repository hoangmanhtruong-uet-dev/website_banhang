import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.address.delete({
      where: { id: params.id, userId: session.userId },
    });

    return NextResponse.json({ message: 'Đã xóa' });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
