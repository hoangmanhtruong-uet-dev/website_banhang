/**
 * VNPay Payment Provider
 *
 * Tích hợp VNPay theo luồng redirect:
 *  1. createPaymentUrl()  — tạo URL redirect sang cổng VNPay
 *  2. verifyReturn()      — xác minh chữ ký khi VNPay redirect về
 *  3. verifyIpn()         — xác minh IPN webhook từ VNPay
 *
 * Cấu hình .env:
 *   VNPAY_TMN_CODE=         mã merchant (lấy từ VNPay sandbox portal)
 *   VNPAY_HASH_SECRET=      secret key (lấy từ VNPay sandbox portal)
 *   VNPAY_URL=              https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
 *   VNPAY_RETURN_URL=       https://yourdomain.com/api/payments/vnpay/return
 *   VNPAY_IPN_URL=          https://yourdomain.com/api/payments/vnpay/ipn
 *
 * Sandbox test: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/
 */

import crypto from 'node:crypto';
import { logger } from '@/lib/logger';

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  returnUrl: string;
  ipnUrl?: string;
  locale?: 'vn' | 'en';
  currency?: string;
}

export interface CreateVNPayUrlInput {
  orderId: string;
  amount: number; // VND, integer
  orderInfo: string;
  ipAddress: string;
  bankCode?: string; // Pre-select bank, optional
  createDate?: string; // yyyyMMddHHmmss
}

export interface VNPayReturnParams {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType: string;
  vnp_PayDate: string;
  vnp_CurrCode: string;
  vnp_OrderInfo: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  [key: string]: string | undefined;
}

export interface VNPayVerifyResult {
  isValid: boolean;
  isSuccess: boolean;
  responseCode: string;
  transactionNo: string;
  txnRef: string;
  amount: number; // VND
  bankCode: string;
  payDate: string;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function sortObject(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

function hmacSha512(secret: string, data: string): string {
  return crypto.createHmac('sha512', secret).update(data, 'utf8').digest('hex');
}

export class VNPayProvider {
  constructor(private readonly config: VNPayConfig) {}

  /**
   * Tạo URL redirect sang VNPay payment gateway.
   * Client redirect user đến URL này.
   */
  createPaymentUrl(input: CreateVNPayUrlInput): string {
    const now = new Date();
    const createDate = input.createDate ?? formatDate(now);
    // Expire after 15 minutes
    const expireDate = formatDate(new Date(now.getTime() + 15 * 60 * 1000));

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: this.config.locale ?? 'vn',
      vnp_CurrCode: this.config.currency ?? 'VND',
      vnp_TxnRef: input.orderId,
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(input.amount * 100), // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_IpAddr: input.ipAddress,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (input.bankCode) {
      params.vnp_BankCode = input.bankCode;
    }

    const sorted = sortObject(params);
    const queryString = buildQueryString(sorted);
    const secureHash = hmacSha512(this.config.hashSecret, queryString);

    logger.info('vnpay.create_payment_url', { orderId: input.orderId, amount: input.amount });
    return `${this.config.vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
  }

  /**
   * Xác minh chữ ký trả về từ VNPay (GET redirect sau khi user thanh toán).
   */
  verifyReturn(params: VNPayReturnParams): VNPayVerifyResult {
    const { vnp_SecureHash, vnp_SecureHashType: _type, ...rest } = params;

    const sorted = sortObject(
      Object.fromEntries(
        Object.entries(rest)
          .filter(([k, v]) => k.startsWith('vnp_') && v !== undefined)
          .map(([k, v]) => [k, v!]),
      ),
    );
    const queryString = buildQueryString(sorted);
    const expectedHash = hmacSha512(this.config.hashSecret, queryString);
    const isValid = expectedHash === vnp_SecureHash;

    if (!isValid) {
      logger.warn('vnpay.verify_return.invalid_signature', { txnRef: params.vnp_TxnRef });
    }

    return {
      isValid,
      isSuccess: isValid && params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00',
      responseCode: params.vnp_ResponseCode,
      transactionNo: params.vnp_TransactionNo,
      txnRef: params.vnp_TxnRef,
      amount: Math.round(Number(params.vnp_Amount) / 100),
      bankCode: params.vnp_BankCode,
      payDate: params.vnp_PayDate,
    };
  }

  /**
   * Xác minh IPN webhook (POST từ VNPay server).
   * Trả về response body theo spec VNPay.
   */
  verifyIpn(params: VNPayReturnParams): { RspCode: string; Message: string; result: VNPayVerifyResult } {
    const result = this.verifyReturn(params);

    if (!result.isValid) {
      return { RspCode: '97', Message: 'Invalid signature', result };
    }

    logger.info('vnpay.ipn_received', {
      txnRef: result.txnRef,
      transactionNo: result.transactionNo,
      responseCode: result.responseCode,
      amount: result.amount,
    });

    return { RspCode: '00', Message: 'Confirmed', result };
  }
}

/**
 * Singleton VNPay provider — chỉ khởi tạo khi cấu hình đầy đủ.
 */
let _vnpayProvider: VNPayProvider | null = null;

export function getVNPayProvider(): VNPayProvider | null {
  if (_vnpayProvider) return _vnpayProvider;

  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim();
  const vnpUrl = process.env.VNPAY_URL?.trim() ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNPAY_RETURN_URL?.trim() ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/vnpay/return`;

  if (!tmnCode || !hashSecret) {
    return null;
  }

  _vnpayProvider = new VNPayProvider({ tmnCode, hashSecret, vnpUrl, returnUrl });
  return _vnpayProvider;
}

export function isVNPayConfigured(): boolean {
  return Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET);
}
