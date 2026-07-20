import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT: Cập nhật Voucher (chỉ cập nhật được nếu voucher thuộc về chính người bán này)
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Kiểm tra tính sở hữu
    const existingVoucher = await prisma.voucher.findUnique({ where: { id: params.id } });
    if (!existingVoucher) {
      return NextResponse.json({ error: 'Voucher không tồn tại' }, { status: 404 });
    }

    if (existingVoucher.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa voucher này' }, { status: 403 });
    }

    const body = await req.json();
    const { description, discountType, discountValue, minOrderValue, maxDiscount, endDate, usageLimit } = body;

    const updatedVoucher = await prisma.voucher.update({
      where: { id: params.id },
      data: {
        description: description ?? existingVoucher.description,
        discountType: discountType ?? existingVoucher.discountType,
        discountValue: discountValue ? parseFloat(discountValue) : existingVoucher.discountValue,
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : existingVoucher.minOrderValue,
        maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : existingVoucher.maxDiscount,
        endDate: endDate ? new Date(endDate) : existingVoucher.endDate,
        usageLimit: usageLimit ? parseInt(usageLimit) : existingVoucher.usageLimit
      }
    });

    return NextResponse.json({ message: 'Cập nhật voucher thành công ✨', voucher: updatedVoucher });
  } catch (error) {
    console.error('[PUT_SELLER_VOUCHER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE: Xóa vĩnh viễn Voucher
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const existingVoucher = await prisma.voucher.findUnique({ where: { id: params.id } });
    if (!existingVoucher) {
      return NextResponse.json({ error: 'Voucher không tồn tại' }, { status: 404 });
    }

    if (existingVoucher.sellerId !== session.userId) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa voucher này' }, { status: 403 });
    }

    await prisma.voucher.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Đã xóa voucher thành công 🗑️' });
  } catch (error) {
    console.error('[DELETE_SELLER_VOUCHER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
