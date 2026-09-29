/**
 * POST /api/payments/vnpay/create-url
 * Tạo URL redirect sang VNPay payment gateway.
 *
 * Body: { orderId: string; amount: number; orderInfo?: string; bankCode?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/auth';
import { getVNPayProvider } from '@/lib/services/payment/vnpay-provider';
import { z } from 'zod';

export const runtime = 'nodejs';

const schema = z.object({
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
  orderInfo: z.string().max(255).default('Thanh toan don hang MTRUONG-STORE'),
  bankCode: z.string().optional(),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vnpay = getVNPayProvider();
    if (!vnpay) {
      return NextResponse.json(
        { error: 'VNPay chưa được cấu hình. Vui lòng liên hệ admin.' },
        { status: 503 }
      );
    }

    const body = schema.parse(await req.json());
    const ip = getClientIp(req);

    const paymentUrl = vnpay.createPaymentUrl({
      orderId: body.orderId,
      amount: body.amount,
      orderInfo: body.orderInfo,
      ipAddress: ip,
      bankCode: body.bankCode,
    });

    return NextResponse.json({ paymentUrl });
  } catch (error) {
    console.error('[VNPAY_CREATE_URL]', error);
    return NextResponse.json({ error: 'Lỗi tạo URL thanh toán' }, { status: 500 });
  }
}
