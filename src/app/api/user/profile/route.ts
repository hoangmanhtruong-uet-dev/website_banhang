import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const allowed: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) allowed.name = body.name.trim();
    if (typeof body.phone === 'string') allowed.phone = body.phone.trim() || null;
    if (['male', 'female', 'other'].includes(body.gender)) allowed.gender = body.gender;
    if (body.birthday) allowed.birthday = new Date(body.birthday);
    if (typeof body.avatar === 'string') allowed.avatar = body.avatar;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu hợp lệ để cập nhật' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: allowed,
    });

    return NextResponse.json({ 
      message: 'Cập nhật thành công', 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        gender: updatedUser.gender,
        birthday: updatedUser.birthday,
        avatar: updatedUser.avatar,
      } 
    });
  } catch (error) {
    console.error('[PROFILE_UPDATE]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
