import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { roleUpdateSchema } from '@/lib/validations';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { role } = roleUpdateSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Tài khoản không tồn tại');
    if (admin.userId === id && role !== user.role) throw new ValidationError('Không thể tự thay đổi role của tài khoản đang đăng nhập');
    if (user.role === 'admin' && role !== 'admin') {
      const activeAdmins = await prisma.user.count({ where: { role: 'admin', isActive: true } });
      if (activeAdmins <= 1) throw new ConflictError('Hệ thống phải còn ít nhất một admin hoạt động');
    }
    const updated = await prisma.user.update({
      where: { id }, data: { role },
      select: { id: true, code: true, name: true, email: true, role: true, isActive: true, isSeller: true },
    });
    if (role !== user.role) await prisma.session.deleteMany({ where: { userId: id } });
    return updated;
  })(req);
}