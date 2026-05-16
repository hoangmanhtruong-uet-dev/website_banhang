import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    // Lấy user hiện tại
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Hash mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Cập nhật
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedNewPassword }
    });

    return NextResponse.json({ message: 'Đã đổi mật khẩu thành công' });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
