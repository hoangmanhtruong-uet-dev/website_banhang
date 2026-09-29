/**
 * POST /api/payments/vnpay/ipn
 * VNPay IPN (Instant Payment Notification) webhook.
 * VNPay server gọi endpoint này để thông báo kết quả thanh toán server-to-server.
 * KHÔNG yêu cầu auth — phải verify bằng chữ ký HMAC-SHA512.
 *
 * Response phải trả về trong 5 giây, theo định dạng:
 *   { RspCode: "00", Message: "Confirmed" }  — thành công
 *   { RspCode: "97", Message: "..." }         — lỗi chữ ký
 *   { RspCode: "01", Message: "..." }         — order không tồn tại
 *   { RspCode: "04", Message: "..." }         — số tiền không khớp
 *   { RspCode: "02", Message: "..." }         — order đã xử lý
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVNPayProvider } from '@/lib/services/payment/vnpay-provider';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const vnpay = getVNPayProvider();
    if (!vnpay) {
      return NextResponse.json({ RspCode: '99', Message: 'Provider not configured' });
    }

    const body = await req.json();
    const { RspCode, Message, result } = vnpay.verifyIpn(body);

    if (RspCode !== '00') {
      return NextResponse.json({ RspCode, Message });
    }

    // Tìm order trong DB
    const order = await prisma.order.findUnique({
      where: { id: result.txnRef },
      select: { id: true, status: true, total: true, paymentStatus: true },
    });

    if (!order) {
      logger.warn('vnpay.ipn.order_not_found', { txnRef: result.txnRef });
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
    }

    // Kiểm tra số tiền khớp (tolerance 1 VND)
    const orderTotal = Math.round(Number(order.total));
    if (Math.abs(orderTotal - result.amount) > 1) {
      logger.warn('vnpay.ipn.amount_mismatch', {
        txnRef: result.txnRef,
        expected: orderTotal,
        received: result.amount,
      });
      return NextResponse.json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // Kiểm tra đã xử lý chưa
    if (order.paymentStatus === 'completed') {
      logger.info('vnpay.ipn.already_processed', { txnRef: result.txnRef });
      return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' });
    }

    if (result.isSuccess) {
      // Cập nhật order thành đã thanh toán
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'completed',
          status: 'paid',
          paidAt: new Date(),
        },
      });

      logger.info('vnpay.ipn.payment_confirmed', {
        orderId: order.id,
        amount: result.amount,
        transactionNo: result.transactionNo,
        bankCode: result.bankCode,
      });
    } else {
      // Thanh toán thất bại
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'failed',
          status: 'payment_failed',
        },
      });

      logger.warn('vnpay.ipn.payment_failed', {
        orderId: order.id,
        responseCode: result.responseCode,
      });
    }

    return NextResponse.json({ RspCode: '00', Message: 'Confirmed' });
  } catch (error) {
    logger.error('vnpay.ipn.error', error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}
