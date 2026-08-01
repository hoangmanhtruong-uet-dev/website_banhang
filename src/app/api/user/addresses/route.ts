import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  province: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  ward: z.string().trim().min(2).max(100),
  detailAddress: z.string().trim().min(5).max(300),
  isDefault: z.boolean().optional(),
}).strict();

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await prisma.address.findMany({
      where: { userId: session.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }));
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = addressSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const address = await prisma.$transaction(async tx => {
      const count = await tx.address.count({ where: { userId: session.userId } });
      const makeDefault = count === 0 || parsed.data.isDefault === true;
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId: session.userId,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
          province: parsed.data.province,
          district: parsed.data.district,
          ward: parsed.data.ward,
          detailAddress: parsed.data.detailAddress,
          isDefault: makeDefault,
        },
      });
    });
    return NextResponse.json(address, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}