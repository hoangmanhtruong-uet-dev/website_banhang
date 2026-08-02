import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { adminCreateUserSchema } from '@/lib/validations';
import { generateNextUserId } from '@/lib/idGenerator';

const safeUserSelect = {
  id: true, code: true, name: true, email: true, role: true, isActive: true, isSeller: true,
  phone: true, gender: true, birthday: true, avatar: true, licensePlate: true,
  transportType: true, createdAt: true, updatedAt: true,
} as const;

export async function GET(req: NextRequest) {
  return createHandler(async () => {
    await requireAdmin();
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: safeUserSelect });
  })(req);
}

export async function POST(req: NextRequest) {
  return createHandler(async request => {
    await requireAdmin();
    const input = adminCreateUserSchema.parse(await request.json());
    const password = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        code: await generateNextUserId(input.role), name: input.name, email: input.email,
        password, role: input.role, isSeller: false,
      },
      select: safeUserSelect,
    });
    return NextResponse.json(user, { status: 201 });
  })(req);
}