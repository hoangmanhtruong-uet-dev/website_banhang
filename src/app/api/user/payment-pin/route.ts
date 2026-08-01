import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { PasswordService } from '@/lib/services/password.service';

const pinSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu tài khoản'),
  pin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số'),
});

export const PUT = createHandler(async (req) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const parsed = pinSchema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { password: true } });
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');
  if (!await PasswordService.verify(parsed.currentPassword, user.password)) {
    throw new AuthenticationError('Mật khẩu tài khoản không đúng');
  }
  const paymentPinHash = await PasswordService.hash(parsed.pin);
  await prisma.user.update({ where: { id: session.userId }, data: { paymentPinHash } });
  return { success: true, hasPaymentPin: true };
});