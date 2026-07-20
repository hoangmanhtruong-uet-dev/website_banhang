import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();
    
    const updateData: any = { name, email, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Cập nhật tài khoản thành công ✨',
      user
    });
  } catch (error) {
    console.error('[EDIT_USER]', error);
    return NextResponse.json({ error: 'Lỗi khi cập nhật tài khoản' }, { status: 500 });
  }
}