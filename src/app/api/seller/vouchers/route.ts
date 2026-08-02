import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ConflictError } from '@/lib/errors';
import { sellerVoucherCreateSchema } from '@/lib/validations';

function requireSeller(session: Awaited<ReturnType<typeof getSession>>) {
  if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
  return session;
}

export async function GET(req: NextRequest) {
  return createHandler(async () => {
    const session = requireSeller(await getSession());
    return prisma.voucher.findMany({ where: { sellerId: session.userId }, orderBy: { createdAt: 'desc' } });
  })(req);
}

export async function POST(req: NextRequest) {
  return createHandler(async request => {
    const session = requireSeller(await getSession());
    const input = sellerVoucherCreateSchema.parse(await request.json());
    if (await prisma.voucher.findUnique({ where: { code: input.code }, select: { id: true } })) {
      throw new ConflictError('Mã voucher đã tồn tại');
    }
    const voucher = await prisma.voucher.create({
      data: {
        ...input,
        description: input.description ?? null,
        maxDiscount: input.maxDiscount ?? null,
        startDate: input.startDate ?? new Date(),
        sellerId: session.userId,
      },
    });
    return NextResponse.json({ message: 'Tạo voucher thành công', voucher }, { status: 201 });
  })(req);
}