import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm phải có ít nhất 2 ký tự'),
  price: z.number().positive('Giá phải lớn hơn 0'),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  image: z.string().optional().nullable(),
});

export const orderSchema = z.object({
  customerName: z.string().min(2, 'Vui lòng nhập họ tên'),
  customerEmail: z.string().email('Email không hợp lệ'),
  customerPhone: z.string().regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ'),
  shippingAddress: z.string().min(10, 'Vui lòng nhập địa chỉ đầy đủ'),
  paymentMethod: z.enum(['COD', 'Banking', 'MoMo']),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp', path: ['confirmPassword'],
});