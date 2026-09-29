/**
 * GET /api/payments/vnpay/return
 * VNPay redirect user về đây sau khi thanh toán (thành công hoặc thất bại).
 * Xác minh chữ ký và redirect đến trang kết quả phù hợp.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVNPayProvider } from '@/lib/services/payment/vnpay-provider';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const vnpay = getVNPayProvider();
    if (!vnpay) {
      return NextResponse.redirect(new URL('/checkout?error=payment_config', req.url));
    }

    // Lấy tất cả query params từ VNPay
    const searchParams = req.nextUrl.searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = vnpay.verifyReturn(params as any);

    logger.info('vnpay.return', {
      txnRef: result.txnRef,
      isValid: result.isValid,
      isSuccess: result.isSuccess,
      responseCode: result.responseCode,
    });

    if (!result.isValid) {
      return NextResponse.redirect(
        new URL(`/checkout/payment?status=error&code=invalid_signature`, req.nextUrl.origin)
      );
    }

    if (result.isSuccess) {
      // Thanh toán thành công — redirect về trang đơn hàng
      return NextResponse.redirect(
        new URL(`/profile/orders?payment=success&orderId=${result.txnRef}`, req.nextUrl.origin)
      );
    }

    // Thanh toán thất bại
    const failCodes: Record<string, string> = {
      '24': 'cancelled', // user hủy
      '51': 'insufficient_funds',
      '65': 'limit_exceeded',
      '75': 'bank_maintenance',
    };
    const reason = failCodes[result.responseCode] ?? 'failed';

    return NextResponse.redirect(
      new URL(`/checkout/payment?status=error&code=${reason}&orderId=${result.txnRef}`, req.nextUrl.origin)
    );
  } catch (error) {
    logger.error('vnpay.return.error', error);
    return NextResponse.redirect(new URL('/checkout?error=payment_error', req.nextUrl.origin));
  }
}
