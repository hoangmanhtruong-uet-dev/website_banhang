import { Prisma } from '@prisma/client';
import { type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { adminUpdateUserSchema } from '@/lib/validations';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = adminUpdateUserSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Tài khoản không tồn tại');
    if (input.role && admin.userId === id && input.role !== existing.role) {
      throw new ValidationError('Không thể tự thay đổi role của tài khoản đang đăng nhập');
    }
    if (existing.role === 'admin' && input.role && input.role !== 'admin') {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', isActive: true } });
      if (activeAdmins <= 1) throw new ConflictError('Hệ thống phải còn ít nhất một admin hoạt động');
    }
    const data: Prisma.UserUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.password !== undefined ? { password: await bcrypt.hash(input.password, 12) } : {}),
    };
    const user = await prisma.user.update({
      where: { id }, data,
      select: { id: true, code: true, name: true, email: true, role: true, isActive: true, isSeller: true, updatedAt: true },
    });
    if (input.role && input.role !== existing.role) await prisma.session.deleteMany({ where: { userId: id } });
    return { message: 'Cập nhật tài khoản thành công', user };
  })(req);
}