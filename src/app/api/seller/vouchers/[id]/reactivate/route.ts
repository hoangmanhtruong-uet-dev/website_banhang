import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT: Kích hoạt lại Voucher (Kéo dài ngày hết hạn thêm 30 ngày)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa voucher này' }, { status: 403 });
    }

    // Nhận ngày hết hạn mới nếu được truyền lên, ngược lại mặc định cộng thêm 30 ngày kể từ hôm nay
    const body = await req.json().catch(() => ({}));
    let newEndDate = body.endDate ? new Date(body.endDate) : null;

    if (!newEndDate) {
      const today = new Date();
      today.setDate(today.getDate() + 30); // Thêm 30 ngày
      newEndDate = today;
    }

    const updatedVoucher = await prisma.voucher.update({
      where: { id: params.id },
      data: {
        endDate: newEndDate,
        // Có thể reset lại usedCount về 0 hoặc giữ nguyên tùy ý. Cứ giữ nguyên hoặc tăng thêm usageLimit nếu muốn.
      }
    });

    return NextResponse.json({ 
      message: 'Kích hoạt lại và gia hạn voucher thành công! ✨', 
      voucher: updatedVoucher 
    });
  } catch (error) {
    console.error('[REACTIVATE_VOUCHER]', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
