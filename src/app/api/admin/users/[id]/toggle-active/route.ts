import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Không cho tự khóa tài khoản chính mình
    if (session.userId === params.id) {
      return NextResponse.json({ error: 'Bạn không thể tự khóa tài khoản của chính mình' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: !user.isActive },
    });

    return NextResponse.json({
      message: updatedUser.isActive ? 'Đã mở khóa tài khoản thành công ✨' : 'Đã khóa tài khoản thành công 🔒',
      user: updatedUser
    });
  } catch (error) {
    console.error('[TOGGLE_ACTIVE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
