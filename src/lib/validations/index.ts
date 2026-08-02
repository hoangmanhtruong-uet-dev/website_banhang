import { z } from 'zod';
import { DEFAULT_CURRENCY, Money, normalizeCurrency, parseMoneyInput } from '@/lib/utils/money';

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

export const productBaseSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự'),
  price: moneyInputSchema({ allowZero: false, field: 'price' }),
  originalPrice: moneyInputSchema({ field: 'originalPrice' }).nullable().optional(),
  currency: currencySchema,
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  image: z.string().optional().nullable(),
});

export const productSchema = productBaseSchema.superRefine((data, ctx) => {
  if (data.originalPrice && Money.compare(data.originalPrice, data.price) <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Giá gốc phải lớn hơn giá bán', path: ['originalPrice'] });
  }
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
  paymentPin: z.string().regex(/^\d{6}$/, 'Mã PIN phải gồm đúng 6 chữ số').optional(),
  bankId: z.string().min(1).optional(),
  paymentPhone: z.string().regex(/^0\d{9}$/, 'Số điện thoại MoMo không hợp lệ').optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'Banking' && !data.bankId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng chọn tài khoản ngân hàng', path: ['bankId'] });
  }
  if (data.paymentMethod === 'MoMo' && !data.paymentPhone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng nhập số điện thoại MoMo', path: ['paymentPhone'] });
  }
  if (data.paymentMethod !== 'COD' && !data.paymentPin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vui lòng nhập mã PIN giao dịch', path: ['paymentPin'] });
  }
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
const dateInputSchema = z.string().trim().min(1, 'Ngày không được để trống').transform((value, ctx) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày không hợp lệ' });
    return z.NEVER;
  }
  return date;
});

const sellerVoucherFields = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/, 'Mã voucher chỉ gồm chữ, số, _ hoặc -').transform(value => value.toUpperCase()),
  description: z.string().trim().max(500).nullable().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: moneyInputSchema({ allowZero: false, field: 'discountValue' }),
  minOrderValue: moneyInputSchema({ field: 'minOrderValue' }).default('0'),
  maxDiscount: moneyInputSchema({ field: 'maxDiscount' }).nullable().optional(),
  currency: currencySchema,
  startDate: dateInputSchema.optional(),
  endDate: dateInputSchema,
  usageLimit: z.number().int().positive().max(1_000_000).default(100),
}).strict();

export const sellerVoucherCreateSchema = sellerVoucherFields.superRefine((data, ctx) => {
  if (data.discountType === 'percentage' && Money.compare(data.discountValue, '100') > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phần trăm giảm không được vượt quá 100', path: ['discountValue'] });
  }
  if (data.endDate <= (data.startDate ?? new Date())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ngày kết thúc phải ở tương lai và sau ngày bắt đầu', path: ['endDate'] });
  }
});

export const sellerVoucherUpdateSchema = sellerVoucherFields.omit({ code: true }).partial().strict();

export const USER_ROLES = ['user', 'admin', 'shipper'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export const roleUpdateSchema = z.object({ role: userRoleSchema }).strict();
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  role: userRoleSchema.default('user'),
}).strict();
export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: userRoleSchema.optional(),
}).strict().refine(value => Object.keys(value).length > 0, { message: 'Không có dữ liệu cần cập nhật' });

export const loginSchema = z.object({ email: z.string().email('Email không hợp lệ'), password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự') });
export const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'), email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'), confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: 'Mật khẩu xác nhận không khớp', path: ['confirmPassword'] });
