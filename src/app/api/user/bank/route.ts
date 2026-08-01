import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';

const bankSchema = z.object({
  bankName: z.string().trim().min(2, 'Vui lòng nhập tên ngân hàng').max(100),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/, 'Số tài khoản phải gồm 6-20 chữ số'),
  accountName: z.string().trim().min(2, 'Vui lòng nhập tên chủ tài khoản').max(100),
  isDefault: z.boolean().optional().default(false),
});

export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  return prisma.bankInfo.findMany({ where: { userId: session.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
});

export const POST = createHandler(async (req) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const parsed = bankSchema.parse(await req.json());
  return prisma.$transaction(async (tx) => {
    const count = await tx.bankInfo.count({ where: { userId: session.userId } });
    const isDefault = parsed.isDefault || count === 0;
    if (isDefault) await tx.bankInfo.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
    return tx.bankInfo.create({ data: { ...parsed, isDefault, userId: session.userId } });
  });
});