import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { InventoryService } from '@/lib/services/inventory.service';
import { buildProviderIdempotencyKey, internalWalletProvider } from '@/lib/services/payment-provider';
import { DEFAULT_CURRENCY, Money, assertSameCurrency } from '@/lib/utils/money';

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

    await InventoryService.assertPendingOrderAllowance(tx, userId);
    const itemMap = items.reduce((map, item) => {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
      return map;
    }, new Map<string, number>());
    const mergedItems = Array.from(itemMap, ([productId, quantity]) => ({ productId, quantity }));
    const products = await tx.product.findMany({ where: { id: { in: mergedItems.map((item) => item.productId) } } });
    if (products.length !== mergedItems.length) throw new ValidationError('Có sản phẩm không tồn tại');

    const orderItemsData: Array<{ productId: string; quantity: number; price: Prisma.Decimal; lineTotal: Prisma.Decimal; currency: string }> = [];
    for (const item of mergedItems) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) throw new NotFoundError(`Sản phẩm ${item.productId} không tồn tại`);
      assertSameCurrency(product.currency, DEFAULT_CURRENCY);
      const lineTotal = Money.round(Money.multiply(product.price, item.quantity));
      orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price, lineTotal, currency: product.currency });
    }
    const subtotal = Money.round(Money.sum(orderItemsData.map((item) => item.lineTotal)));

    let discount = new Prisma.Decimal(0);
    if (voucherCode) {
      const voucher = await tx.voucher.findUnique({ where: { code: voucherCode } });
      if (!voucher) throw new ValidationError('Mã giảm giá không tồn tại');
      assertSameCurrency(voucher.currency, DEFAULT_CURRENCY);
      const now = new Date();
      if (now < voucher.startDate || now > voucher.endDate) throw new ValidationError('Mã giảm giá đã hết hạn hoặc chưa bắt đầu');
      if (Money.compare(subtotal, voucher.minOrderValue) < 0) throw new ValidationError(`Đơn hàng tối thiểu ${Money.serialize(voucher.minOrderValue)} VND`);
      const voucherUpdate = await tx.voucher.updateMany({
        where: { id: voucher.id, usedCount: { lt: voucher.usageLimit } },
        data: { usedCount: { increment: 1 } },
      });
      if (voucherUpdate.count !== 1) throw new ConflictError('Mã giảm giá đã hết lượt sử dụng');
      discount = voucher.discountType === 'percentage'
        ? Money.divide(Money.multiply(subtotal, voucher.discountValue), '100')
        : voucher.discountValue;
      if (voucher.maxDiscount) discount = Money.min(discount, voucher.maxDiscount);
      discount = Money.round(Money.min(discount, subtotal));
    }

    const shippingFee = new Prisma.Decimal(0);
    const taxAmount = new Prisma.Decimal(0);
    const total = Money.round(Money.add(Money.subtract(subtotal, discount), Money.add(shippingFee, taxAmount)));
    if (Money.compare(total, '0') < 0) throw new ValidationError('Tổng đơn hàng không thể âm');

    const needsDeduction = paymentMethod === 'Banking' || paymentMethod === 'MoMo';
    let walletBefore: Prisma.Decimal | null = null;
    let walletAfter: Prisma.Decimal | null = null;
    if (needsDeduction) {
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${userId} FOR UPDATE`);
      const wallet = await tx.user.findUnique({ where: { id: userId }, select: { balance: true, currency: true } });
      if (!wallet) throw new NotFoundError('Không tìm thấy ví');
      assertSameCurrency(wallet.currency, DEFAULT_CURRENCY);
      if (Money.compare(wallet.balance, total) < 0) throw new ValidationError('Số dư không đủ');
      walletBefore = wallet.balance;
      walletAfter = Money.round(Money.subtract(wallet.balance, total));
      await tx.user.update({ where: { id: userId }, data: { balance: walletAfter } });
    }

    const createdOrder = await tx.order.create({
      data: {
        customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress, paymentMethod, paymentStatus: 'pending', subtotal,
        discountAmount: discount, shippingFee, taxAmount, total, currency: DEFAULT_CURRENCY,
        status: 'pending', userId, idempotencyScope: userId, idempotencyKey: input.idempotencyKey,
        orderItems: { create: orderItemsData },
      },
      include: { orderItems: { include: { product: true } } },
    });
    await InventoryService.reserveOrderItems(tx, createdOrder.id, createdOrder.orderItems.map((item) => ({ id: item.id, productId: item.productId, quantity: item.quantity })));
    await testHooks?.afterInventoryUpdate?.();
    await testHooks?.afterOrderCreation?.();

    if (needsDeduction && walletBefore && walletAfter) {
      const operation = `payment:create:${createdOrder.id}`;
      const providerIdempotencyKey = buildProviderIdempotencyKey(operation, userId, input.idempotencyKey);
      const providerResult = await internalWalletProvider.createPayment({ orderId: createdOrder.id, userId, amount: Money.serialize(total), currency: DEFAULT_CURRENCY }, providerIdempotencyKey);
      if (providerResult.outcome !== 'SUCCEEDED') throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);
      const payment = await tx.payment.create({
        data: { orderId: createdOrder.id, userId, amount: total, operation, idempotencyKey: input.idempotencyKey,
          providerIdempotencyKey, providerTransactionId: providerResult.transactionId, providerOutcome: providerResult.outcome, currency: DEFAULT_CURRENCY },
      });
      await tx.walletLedger.create({ data: {
        userId, refundId: null, deterministicKey: `payment:${payment.id}:wallet-debit`, referenceType: 'Payment', referenceId: payment.id,
        amount: Money.subtract('0', total), balanceBefore: walletBefore, balanceAfter: walletAfter, currency: DEFAULT_CURRENCY, entryType: 'PAYMENT_DEBIT',
      } });
      await InventoryService.consumeForPayment(tx, createdOrder.id);
    }
    const resultOrder = needsDeduction
      ? await tx.order.findUniqueOrThrow({ where: { id: createdOrder.id }, include: { orderItems: { include: { product: true } } } })
      : createdOrder;
    const { idempotencyKey: _idempotencyKey, idempotencyScope: _idempotencyScope, ...safeOrder } = resultOrder;
    return safeOrder;
  }

  static async getOrders(userId?: string, role?: string) {
    if (!userId) throw new ValidationError('Thiếu người dùng');
    return prisma.order.findMany({ where: role === 'admin' ? {} : { userId }, include: { orderItems: { include: { product: true } } }, orderBy: { createdAt: 'desc' } });
  }

  static async getOrderById(orderId: string, userId: string, role?: string) {
    const order = await prisma.order.findFirst({ where: role === 'admin' ? { id: orderId } : { id: orderId, userId }, include: { orderItems: { include: { product: true } } } });
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
    return order;
  }
}
