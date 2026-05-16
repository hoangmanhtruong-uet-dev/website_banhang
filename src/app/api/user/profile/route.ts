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

    const updatedUser: any = await prisma.user.update({
      where: { id: session.userId },
      data: body,
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
