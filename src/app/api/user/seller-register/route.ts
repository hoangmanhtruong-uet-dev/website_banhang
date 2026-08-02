import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ConflictError } from '@/lib/errors';
import { sellerKycSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  return createHandler(async () => {
    const session = await getSession();
    if (!session) throw new AuthenticationError();
    return prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
  })(req);
}

export async function POST(req: NextRequest) {
  return createHandler(async request => {
    const session = await getSession();
    if (!session) throw new AuthenticationError();
    const input = sellerKycSchema.parse(await request.json());
    const existing = await prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
    if (existing?.status === 'APPROVED') throw new ConflictError('Seller đã được phê duyệt');
    return prisma.sellerProfile.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, ...input, status: 'PENDING' },
      update: { ...input, status: 'PENDING', submittedAt: new Date(), decidedAt: null, decidedBy: null, rejectionReason: null },
    });
  })(req);
}