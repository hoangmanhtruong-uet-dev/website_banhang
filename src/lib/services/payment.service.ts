import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { buildProviderIdempotencyKey, internalWalletProvider } from '@/lib/services/payment-provider';

export class PaymentService {
  static async create(tx: TransactionClient, input: { orderId: string; userId: string; idempotencyKey: string }) {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('`order`')} WHERE id = ${input.orderId} FOR UPDATE`);
    const order = await tx.order.findFirst({ where: { id: input.orderId, userId: input.userId } });
    if (!order) throw new NotFoundError('Không tìm thấy đơn hàng');
    if (order.paymentStatus === 'paid') throw new ConflictError('Đơn hàng đã được thanh toán');
    if (order.paymentStatus === 'refunded' || ['cancelled', 'returned'].includes(order.status)) {
      throw new ConflictError('Không thể thanh toán đơn hàng đã hủy, trả hoặc hoàn tiền');
    }

    const operation = `payment:create:${order.id}`;
    const providerIdempotencyKey = buildProviderIdempotencyKey(operation, input.userId, input.idempotencyKey);
    const providerResult = await internalWalletProvider.createPayment(
      { orderId: order.id, userId: input.userId, amount: order.total },
      providerIdempotencyKey,
    );
    if (providerResult.outcome !== 'SUCCEEDED') {
      throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);
    }

    const userUpdate = await tx.user.updateMany({
      where: { id: input.userId, balance: { gte: order.total } },
      data: { balance: { decrement: order.total } },
    });
    if (userUpdate.count !== 1) throw new ValidationError('Số dư không đủ');

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        userId: input.userId,
        amount: order.total,
        operation,
        idempotencyKey: input.idempotencyKey,
        providerIdempotencyKey,
        providerTransactionId: providerResult.transactionId,
        providerOutcome: providerResult.outcome,
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'paid' } });
    const { idempotencyKey: _idempotencyKey, ...safePayment } = payment;
    return safePayment;
  }
}

export class RefundService {
  static async create(tx: TransactionClient, input: { paymentId: string; userId: string; amount: number; idempotencyKey: string }) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new ValidationError('Số tiền hoàn phải lớn hơn 0');
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM payment WHERE id = ${input.paymentId} FOR UPDATE`);
    const payment = await tx.payment.findFirst({ where: { id: input.paymentId, userId: input.userId } });
    if (!payment) throw new NotFoundError('Không tìm thấy giao dịch thanh toán');

    const aggregate = await tx.refund.aggregate({ where: { paymentId: payment.id, status: 'completed' }, _sum: { amount: true } });
    const alreadyRefunded = aggregate._sum.amount ?? 0;
    if (alreadyRefunded + input.amount > payment.amount + Number.EPSILON) {
      throw new ConflictError('Tổng số tiền hoàn vượt quá số tiền đã thanh toán');
    }

    const operation = `payment:refund:${payment.id}`;
    const providerIdempotencyKey = buildProviderIdempotencyKey(operation, input.userId, input.idempotencyKey);
    const providerResult = await internalWalletProvider.createRefund(
      { paymentId: payment.id, userId: input.userId, amount: input.amount },
      providerIdempotencyKey,
    );
    if (providerResult.outcome !== 'SUCCEEDED') {
      throw new ConflictError(`Payment provider outcome: ${providerResult.outcome}`);
    }

    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        userId: input.userId,
        amount: input.amount,
        operation,
        idempotencyKey: input.idempotencyKey,
        providerRefundId: providerResult.transactionId,
        providerOutcome: providerResult.outcome,
      },
    });
    await tx.user.update({ where: { id: input.userId }, data: { balance: { increment: input.amount } } });
    if (alreadyRefunded + input.amount >= payment.amount) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'refunded' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'refunded' } });
    }
    const { idempotencyKey: _idempotencyKey, ...safeRefund } = refund;
    return safeRefund;
  }
}