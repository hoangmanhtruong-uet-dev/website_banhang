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
  isDefault: z.boolean(),
}).strict();

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = addressSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    const { id } = await context.params;

    const address = await prisma.$transaction(async tx => {
      const existing = await tx.address.findFirst({ where: { id, userId: session.userId } });
      if (!existing) return null;
      if (parsed.data.isDefault) {
        await tx.address.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
      }
      return tx.address.update({
        where: { id },
        data: parsed.data,
      });
    });
    if (!address) return NextResponse.json({ error: 'Địa chỉ không tồn tại' }, { status: 404 });
    return NextResponse.json(address);
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: Context) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;

    const deleted = await prisma.$transaction(async tx => {
      const existing = await tx.address.findFirst({ where: { id, userId: session.userId } });
      if (!existing) return false;
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const replacement = await tx.address.findFirst({ where: { userId: session.userId }, orderBy: { createdAt: 'desc' } });
        if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
      return true;
    });
    if (!deleted) return NextResponse.json({ error: 'Địa chỉ không tồn tại' }, { status: 404 });
    return NextResponse.json({ message: 'Đã xóa' });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}