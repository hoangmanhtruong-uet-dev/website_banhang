import prisma from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { buildProviderIdempotencyKey, internalWalletProvider } from '@/lib/services/payment-provider';

export interface CreateOrderInput {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  voucherCode?: string;
  idempotencyKey: string;
  items: { productId: string; quantity: number }[];
}

export interface OrderTestHooks {
  afterInventoryUpdate?: () => Promise<void> | void;
  afterOrderCreation?: () => Promise<void> | void;
}

export class OrderService {
  static async createOrder(input: CreateOrderInput) {
    return prisma.$transaction((tx) => this.createOrderInTransaction(tx, input));
  }

  static async createOrderInTransaction(tx: TransactionClient, input: CreateOrderInput, testHooks?: OrderTestHooks) {
    if (testHooks && process.env.NODE_ENV !== 'test') throw new ValidationError('Test hooks are disabled outside NODE_ENV=test');
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
    const productIds = mergedItems.map((item) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new ValidationError('Có sản phẩm không tồn tại');

    let subtotal = 0;
    const orderItemsData: { productId: string; quantity: number; price: number }[] = [];
    for (const item of mergedItems) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) throw new NotFoundError(`Sản phẩm ${item.productId} không tồn tại`);
      const stockUpdate = await tx.product.updateMany({
        where: { id: product.id, stockQuantity: { gte: item.quantity } },
        data: { stockQuantity: { decrement: item.quantity }, inStock: product.stockQuantity - item.quantity > 0 },
      });
      if (stockUpdate.count !== 1) throw new ConflictError(`Sản phẩm ${product.name} không đủ hàng`);
      subtotal += product.price * item.quantity;
      orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
    }

    await testHooks?.afterInventoryUpdate?.();

    let discount = 0;
    if (voucherCode) {
      const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
      if (!voucher) throw new ValidationError('Mã giảm giá không tồn tại');
      const now = new Date();
      if (now < voucher.startDate || now > voucher.endDate) throw new ValidationError('Mã giảm giá đã hết hạn hoặc chưa bắt đầu');
      if (subtotal < voucher.minOrderValue) throw new ValidationError(`Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()}đ để dùng mã này`);
      const voucherUpdate = await tx.voucher.updateMany({
        where: { id: voucher.id, usedCount: { lt: voucher.usageLimit } },
        data: { usedCount: { increment: 1 } },
      });
      if (voucherUpdate.count !== 1) throw new ConflictError('Mã giảm giá đã hết lượt sử dụng');
      discount = voucher.discountType === 'percentage' ? (subtotal * voucher.discountValue) / 100 : voucher.discountValue;
      if (voucher.maxDiscount && discount > voucher.maxDiscount) discount = voucher.maxDiscount;
    }

    const total = Math.max(0, subtotal - discount);
    const needsDeduction = paymentMethod === 'Banking' || paymentMethod === 'MoMo';
    let paymentStatus = 'pending';
    if (needsDeduction) {
      const userUpdate = await tx.user.updateMany({
        where: { id: userId, balance: { gte: total } },
        data: { balance: { decrement: total } },
      });
      if (userUpdate.count !== 1) throw new ValidationError('Số dư không đủ');
      paymentStatus = 'paid';
    }

    const createdOrder = await tx.order.create({
      data: {
        customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress, paymentMethod, paymentStatus, total, status: 'pending', userId,
        idempotencyScope: userId, idempotencyKey: input.idempotencyKey,
        orderItems: { create: orderItemsData },
      },
      include: { orderItems: { include: { product: true } } },
    });
    await testHooks?.afterOrderCreation?.();

    if (needsDeduction) {
      const operation = `payment:create:${createdOrder.id}`;
      const providerIdempotencyKey = buildProviderIdempotencyKey(operation, userId, input.idempotencyKey);
      const providerResult = await internalWalletProvider.createPayment({ orderId: createdOrder.id, userId, amount: total }, providerIdempotencyKey);
      if (providerResult.outcome !== 'SUCCEEDED') throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);
      await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          userId,
          amount: total,
          operation,
          idempotencyKey: input.idempotencyKey,
          providerIdempotencyKey,
          providerTransactionId: providerResult.transactionId,
          providerOutcome: providerResult.outcome,
        },
      });
    }
    const { idempotencyKey: _idempotencyKey, idempotencyScope: _idempotencyScope, ...safeOrder } = createdOrder;
    return safeOrder;
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