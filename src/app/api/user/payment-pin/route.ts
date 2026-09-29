import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError } from '@/lib/errors';
import { PasswordService } from '@/lib/services/auth/password.service';

const pinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số'),
});

export const PUT = createHandler(async (req) => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const parsed = pinSchema.parse(await req.json());
  
  const paymentPinHash = await PasswordService.hash(parsed.pin);
  await prisma.user.update({ where: { id: session.userId }, data: { paymentPinHash } });
  return { success: true, hasPaymentPin: true };
});