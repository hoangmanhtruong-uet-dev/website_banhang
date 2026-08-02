import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';

export async function GET(req: NextRequest) {
  return createHandler(async request => {
    await requireAdmin();
    const status = new URL(request.url).searchParams.get('status');
    return prisma.sellerProfile.findMany({
      where: status ? { status } : {},
      include: { user: { select: { id: true, code: true, name: true, email: true, phone: true, isSeller: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  })(req);
}