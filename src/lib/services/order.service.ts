import prisma from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '../errors';

export interface CreateOrderInput {
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  voucherCode?: string;
  idempotencyKey?: string;
  items: { productId: string; quantity: number }[];
}

export class OrderService {
  static async createOrder(input: CreateOrderInput) {
    const { items, userId, paymentMethod, voucherCode } = input;

    if (!items?.length) throw new ValidationError('Giỏ hàng trống');
    if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
      throw new ValidationError('Sản phẩm hoặc số lượng không hợp lệ');
    }

    const itemMap = items.reduce((map, item) => {
      map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
      return map;
    }, new Map<string, number>());
    const mergedItems = Array.from(itemMap, ([productId, quantity]) => ({ productId, quantity }));

    return await prisma.$transaction(async (tx) => {
      const productIds = mergedItems.map((item) => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });

      if (products.length !== productIds.length) {
        throw new ValidationError('Có sản phẩm không tồn tại');
      }

      let subtotal = 0;
      const orderItemsData: { productId: string; quantity: number; price: number }[] = [];

      for (const item of mergedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new NotFoundError(`Sản phẩm ${item.productId} không tồn tại`);

        const stockUpdate = await tx.product.updateMany({
          where: { id: product.id, stockQuantity: { gte: item.quantity } },
          data: {
            stockQuantity: { decrement: item.quantity },
            inStock: product.stockQuantity - item.quantity > 0,
          },
        });

        if (stockUpdate.count !== 1) {
          throw new ConflictError(`Sản phẩm ${product.name} không đủ hàng`);
        }

        subtotal += product.price * item.quantity;
        orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
      }

      let discount = 0;
      if (voucherCode) {
        const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
        if (!voucher) throw new ValidationError('Mã giảm giá không tồn tại');

        const now = new Date();
        if (now < voucher.startDate || now > voucher.endDate) {
          throw new ValidationError('Mã giảm giá đã hết hạn hoặc chưa bắt đầu');
        }

        if (subtotal < voucher.minOrderValue) {
          throw new ValidationError(`Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()}đ để dùng mã này`);
        }

        const voucherUpdate = await tx.voucher.updateMany({
          where: { id: voucher.id, usedCount: { lt: voucher.usageLimit } },
          data: { usedCount: { increment: 1 } },
        });

        if (voucherUpdate.count !== 1) {
          throw new ConflictError('Mã giảm giá đã hết lượt sử dụng');
        }

        discount = voucher.discountType === 'percentage'
          ? (subtotal * voucher.discountValue) / 100
          : voucher.discountValue;

        if (voucher.maxDiscount && discount > voucher.maxDiscount) {
          discount = voucher.maxDiscount;
        }
      }

      const total = Math.max(0, subtotal - discount);
      const needsDeduction = paymentMethod === 'Banking' || paymentMethod === 'MoMo';
      let paymentStatus = 'pending';

      if (needsDeduction) {
        if (!userId) throw new ValidationError('Vui lòng đăng nhập để thanh toán qua ví');

        const userUpdate = await tx.user.updateMany({
          where: { id: userId, balance: { gte: total } },
          data: { balance: { decrement: total } },
        });

        if (userUpdate.count !== 1) {
          throw new ValidationError('Số dư không đủ');
        }

        paymentStatus = 'paid';
      }

      return tx.order.create({
        data: {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          shippingAddress: input.shippingAddress,
          paymentMethod,
          paymentStatus,
          total,
          status: 'pending',
          userId: userId || null,
          orderItems: { create: orderItemsData },
        },
        include: { orderItems: { include: { product: true } } },
      });
    });
  }

  static async getOrders(userId?: string, role?: string) {
    if (!userId) throw new ValidationError('Thiếu người dùng');
    return prisma.order.findMany({
      where: role === 'admin' ? {} : { userId },
      include: { orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getOrderById(orderId: string, userId: string, role?: string) {
    const order = await prisma.order.findFirst({
      where: role === 'admin' ? { id: orderId } : { id: orderId, userId },
      include: { orderItems: { include: { product: true } } },
    });

    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
    return order;
  }
}