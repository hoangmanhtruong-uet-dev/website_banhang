import { z } from 'zod';
import { DEFAULT_CURRENCY, normalizeCurrency, parseMoneyInput } from '@/lib/utils/money';

export const moneyInputSchema = (options: { allowZero?: boolean; field?: string } = {}) => z.unknown().transform((value, ctx) => {
  try {
    return parseMoneyInput(value, { allowZero: options.allowZero, field: options.field });
  } catch (error: unknown) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid money value' });
    return z.NEVER;
  }
});

export const currencySchema = z.unknown().optional().transform((value, ctx) => {
  try {
    return normalizeCurrency(value ?? DEFAULT_CURRENCY);
  } catch (error: unknown) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid currency' });
    return z.NEVER;
  }
});

export const productSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự'),
  price: moneyInputSchema({ allowZero: false, field: 'price' }),
  originalPrice: moneyInputSchema({ field: 'originalPrice' }).nullable().optional(),
  currency: currencySchema,
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  image: z.string().optional().nullable(),
});

const orderBaseSchema = z.object({
  customerName: z.string().min(2, 'Vui lòng nhập họ tên'),
  customerEmail: z.string().email('Email không hợp lệ'),
  customerPhone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  shippingAddress: z.string().min(10, 'Vui lòng nhập địa chỉ đầy đủ'),
  paymentMethod: z.enum(['COD', 'Banking', 'MoMo']),
});

export const orderSchema = orderBaseSchema;
export const orderRequestSchema = orderBaseSchema.extend({
  voucherCode: z.string().trim().min(1).max(191).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});
export const paymentRequestSchema = z.object({ orderId: z.string().min(1) });
export const refundRequestSchema = z.object({
  paymentId: z.string().min(1),
  amount: moneyInputSchema({ allowZero: false, field: 'amount' }),
  currency: currencySchema,
});

export const voucherMoneySchema = z.object({
  discountValue: moneyInputSchema({ allowZero: false, field: 'discountValue' }),
  minOrderValue: moneyInputSchema({ field: 'minOrderValue' }).default('0'),
  maxDiscount: moneyInputSchema({ field: 'maxDiscount' }).nullable().optional(),
  currency: currencySchema,
});

export const loginSchema = z.object({ email: z.string().email('Email không hợp lệ'), password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự') });
export const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'), email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'), confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: 'Mật khẩu xác nhận không khớp', path: ['confirmPassword'] });
