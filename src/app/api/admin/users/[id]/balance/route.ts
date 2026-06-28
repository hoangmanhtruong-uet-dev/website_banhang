import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// PATCH /api/admin/users/[id]/balance — Admin nạp/sửa tiền cho user
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { balance, amount } = body;

    // Nếu truyền `amount` → cộng thêm vào balance hiện tại
    // Nếu truyền `balance` → set balance cụ thể
    let updateData: { balance: number } | { balance: { increment: number } };

    if (typeof amount === 'number' && amount > 0) {
      updateData = { balance: { increment: amount } };
    } else if (typeof balance === 'number' && balance >= 0) {
      updateData = { balance };
    } else {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData as Record<string, unknown>,
      select: { id: true, name: true, email: true, balance: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/admin/users/:id/balance]', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
