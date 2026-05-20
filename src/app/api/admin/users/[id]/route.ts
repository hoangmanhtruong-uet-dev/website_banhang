import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT: Cập nhật thông tin chi tiết của người dùng
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role, isSeller } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Kiểm tra trùng email (ngoại trừ chính user này)
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: params.id }
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email đã được sử dụng bởi tài khoản khác' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        email,
        role,
        isSeller: !!isSeller
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSeller: true,
        isActive: true,
      }
    });

    return NextResponse.json({ message: 'Cập nhật thông tin thành công ✨', user: updatedUser });
  } catch (error) {
    console.error('[PUT_ADMIN_USER_DETAIL]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE: Xóa tài khoản người dùng
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Không cho tự xóa tài khoản của chính mình
    if (session.userId === params.id) {
      return NextResponse.json({ error: 'Bạn không thể tự xóa tài khoản của chính mình' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Xóa tài khoản thành công' });
  } catch (error) {
    console.error('[DELETE_ADMIN_USER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
