import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Lấy toàn bộ danh sách Voucher của riêng Shop này
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const vouchers = await prisma.voucher.findMany({
      where: { sellerId: session.userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('[GET_SELLER_VOUCHERS]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST: Tạo Voucher mới cho Shop
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (!session.isSeller && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { code, description, discountType, discountValue, minOrderValue, maxDiscount, endDate, usageLimit } = body;

    if (!code || !discountType || !discountValue || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Kiểm tra trùng mã code trên toàn hệ thống
    const existingVoucher = await prisma.voucher.findUnique({ where: { code } });
    if (existingVoucher) {
      return NextResponse.json({ error: 'Mã voucher này đã tồn tại trên hệ thống' }, { status: 400 });
    }

    const newVoucher = await prisma.voucher.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        endDate: new Date(endDate),
        usageLimit: usageLimit ? parseInt(usageLimit) : 100,
        sellerId: session.userId
      }
    });

    return NextResponse.json({ message: 'Tạo voucher thành công ✨', voucher: newVoucher }, { status: 201 });
  } catch (error) {
    console.error('[POST_SELLER_VOUCHER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
