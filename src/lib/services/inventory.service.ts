import { InventoryReservationStatus, Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { ConflictError, ValidationError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { logger } from '@/lib/logger';
import { enqueueOutboxEvent, OUTBOX_EVENT } from '@/lib/services/outbox.service';

export const inventoryConfig = Object.freeze({
  reservationTtlMinutes: positiveInt(process.env.INVENTORY_RESERVATION_TTL_MINUTES, 15, 24 * 60),
  maxActiveOrdersPerUser: positiveInt(process.env.INVENTORY_MAX_ACTIVE_ORDERS_PER_USER, 3, 100),
  maxOrdersPerWindow: positiveInt(process.env.INVENTORY_MAX_ORDERS_PER_WINDOW, 10, 1000),
  orderRateWindowMinutes: positiveInt(process.env.INVENTORY_ORDER_RATE_WINDOW_MINUTES, 1, 60),
  expiryBatchSize: positiveInt(process.env.INVENTORY_EXPIRY_BATCH_SIZE, 100, 1000),
  transactionMaxAttempts: positiveInt(process.env.INVENTORY_TRANSACTION_MAX_ATTEMPTS, 4, 10),
  reconciliationBatchSize: positiveInt(process.env.INVENTORY_RECONCILIATION_BATCH_SIZE, 250, 5000),
});

function positiveInt(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

const orderTransitions: Readonly<Record<string, readonly string[]>> = Object.freeze({
  pending: ['processing', 'cancelled', 'expired', 'payment_review'],
  expired: ['payment_review'],
  cancelled: ['payment_review'],
  payment_review: ['refund_required'],
  refund_required: ['refunded'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
});

export function assertOrderTransition(from: string, to: string): void {
  if (from === to) return;
  if (!orderTransitions[from]?.includes(to)) throw new ConflictError(`Invalid order transition: ${from} -> ${to}`);
}

async function lockOrder(tx: TransactionClient, orderId: string): Promise<void> {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('`order`')} WHERE id = ${orderId} FOR UPDATE`);
}

async function lockedReservations(tx: TransactionClient, orderId: string) {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM inventory_reservation WHERE orderId = ${orderId} ORDER BY productId, id FOR UPDATE`);
  return tx.inventoryReservation.findMany({ where: { orderId }, orderBy: [{ productId: 'asc' }, { id: 'asc' }] });
}

async function transactionWithRetry<T>(operation: (tx: TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= inventoryConfig.transactionMaxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { maxWait: 10_000, timeout: 20_000 });
    } catch (error: unknown) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!retryable || attempt === inventoryConfig.transactionMaxAttempts) throw error;
      logger.warn('inventory.transaction_retry', { attempt });
    }
  }
  throw new ConflictError('Inventory transaction retry limit exceeded');
}

export class InventoryService {
  static expiresAt(now = new Date()): Date {
    return new Date(now.getTime() + inventoryConfig.reservationTtlMinutes * 60_000);
  }

  static async assertPendingOrderAllowance(tx: TransactionClient, userId: string): Promise<void> {
    await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${userId} FOR UPDATE`);
    const active = await tx.order.count({
      where: { userId, status: 'pending', inventoryReservations: { some: { status: InventoryReservationStatus.ACTIVE } } },
    });
    if (active >= inventoryConfig.maxActiveOrdersPerUser) {
      const error = new ConflictError('Maximum active pending orders reached');
      error.code = 'PENDING_ORDER_LIMIT';
      throw error;
    }
    const windowStart = new Date(Date.now() - inventoryConfig.orderRateWindowMinutes * 60_000);
    const recentOrders = await tx.order.count({ where: { userId, createdAt: { gte: windowStart } } });
    if (recentOrders >= inventoryConfig.maxOrdersPerWindow) {
      const error = new ConflictError('Checkout rate limit exceeded');
      error.code = 'ORDER_RATE_LIMIT';
      error.statusCode = 429;
      throw error;
    }
  }

  static async reserveOrderItems(
    tx: TransactionClient,
    orderId: string,
    items: ReadonlyArray<{ id: string; productId: string; quantity: number }>,
    expiresAt = this.expiresAt(),
  ): Promise<void> {
    const sorted = [...items].sort((left, right) => left.productId.localeCompare(right.productId));
    for (const item of sorted) {
      const affected = await tx.$executeRaw(Prisma.sql`
        UPDATE product SET reservedQuantity = reservedQuantity + ${item.quantity}
        WHERE id = ${item.productId} AND stockQuantity - reservedQuantity >= ${item.quantity}`);
      if (affected !== 1) {
        const error = new ConflictError(`Product ${item.productId} does not have enough available stock`);
        error.code = 'OUT_OF_STOCK';
        throw error;
      }
      await tx.inventoryReservation.create({
        data: { orderId, orderItemId: item.id, productId: item.productId, quantity: item.quantity, expiresAt },
      });
    }
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_RESERVED, aggregateType: 'Order', aggregateId: orderId, orderId,
      idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_RESERVED}:${orderId}:${orderId}`,
      payload: { orderId, expiresAt: expiresAt.toISOString() },
    });
  }

  static async consumeForPayment(tx: TransactionClient, orderId: string, paymentId?: string): Promise<'consumed' | 'duplicate' | 'late'> {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const reservations = await lockedReservations(tx, orderId);
    const active = reservations.filter((entry) => entry.status === InventoryReservationStatus.ACTIVE);
    if (active.length === 0) {
      if (reservations.length > 0 && reservations.every((entry) => entry.status === InventoryReservationStatus.CONSUMED)) return 'duplicate';
      if (!['payment_review', 'refund_required', 'refunded'].includes(order.status)) {
        assertOrderTransition(order.status, 'payment_review');
        await tx.order.update({ where: { id: orderId }, data: { status: 'payment_review', paymentStatus: 'paid_late' } });
      }
      await enqueueOutboxEvent(tx, {
        eventType: OUTBOX_EVENT.LATE_PAYMENT_REVIEW_REQUIRED, aggregateType: 'Order', aggregateId: orderId, orderId,
        idempotencyKey: `order:${orderId}:payment-late:${paymentId ?? 'unrecorded'}`,
        payload: { orderId, ...(paymentId ? { paymentId } : {}) },
      });
      return 'late';
    }
    if (active.length !== reservations.length) {
      throw new ConflictError('Order has mixed reservation states and requires reconciliation');
    }
    const now = new Date();
    for (const entry of active) {
      const changed = await tx.product.updateMany({
        where: { id: entry.productId, stockQuantity: { gte: entry.quantity }, reservedQuantity: { gte: entry.quantity } },
        data: { stockQuantity: { decrement: entry.quantity }, reservedQuantity: { decrement: entry.quantity } },
      });
      if (changed.count !== 1) throw new ConflictError('Inventory invariant violation while consuming reservation');
      await tx.product.updateMany({ where: { id: entry.productId, stockQuantity: 0 }, data: { inStock: false } });
      await tx.inventoryReservation.update({ where: { id: entry.id }, data: { status: InventoryReservationStatus.CONSUMED, consumedAt: now } });
    }
    if (order.status === 'pending') {
      assertOrderTransition(order.status, 'processing');
      await tx.order.update({ where: { id: orderId }, data: { status: 'processing', paymentStatus: 'paid' } });
    }
    await enqueueOutboxEvent(tx, {
      eventType: OUTBOX_EVENT.INVENTORY_CONSUMED, aggregateType: 'Order', aggregateId: orderId, orderId,
      idempotencyKey: `inventory:${OUTBOX_EVENT.INVENTORY_CONSUMED}:${orderId}:${orderId}`, payload: { orderId },
    });
    return 'consumed';
  }

  static async releaseOrder(tx: TransactionClient, orderId: string, target: 'RELEASED' | 'EXPIRED'): Promise<number> {
    await lockOrder(tx, orderId);
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const reservations = await lockedReservations(tx, orderId);
    const active = reservations.filter((entry) => entry.status === InventoryReservationStatus.ACTIVE);
    const now = new Date();
    for (const entry of active) {
      const changed = await tx.product.updateMany({
        where: { id: entry.productId, reservedQuantity: { gte: entry.quantity } },
        data: { reservedQuantity: { decrement: entry.quantity } },
      });
      if (changed.count !== 1) throw new ConflictError('Inventory invariant violation while releasing reservation');
      await tx.inventoryReservation.update({
        where: { id: entry.id },
        data: { status: target, releasedAt: now },
      });
    }
    if (active.length > 0 && order.status === 'pending') {
      const next = target === 'EXPIRED' ? 'expired' : 'cancelled';
      assertOrderTransition(order.status, next);
      await tx.order.update({ where: { id: orderId }, data: { status: next } });
      const eventType = target === 'EXPIRED' ? OUTBOX_EVENT.INVENTORY_RESERVATION_EXPIRED : OUTBOX_EVENT.ORDER_CANCELLED;
      await enqueueOutboxEvent(tx, {
        eventType, aggregateType: 'Order', aggregateId: orderId, orderId,
        idempotencyKey: `inventory:${eventType}:${orderId}:${orderId}`, payload: { orderId },
      });
    }
    return active.length;
  }

  static async cancel(orderId: string): Promise<number> {
    return transactionWithRetry((tx) => this.releaseOrder(tx, orderId, 'RELEASED'));
  }

  static async transitionOrderStatus(orderId: string, target: string, trackingNumber?: string) {
    return transactionWithRetry(async (tx) => {
      await lockOrder(tx, orderId);
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      assertOrderTransition(order.status, target);
      return tx.order.update({ where: { id: orderId }, data: { status: target, ...(trackingNumber ? { trackingNumber } : {}) } });
    });
  }
}

export class InventoryExpiryWorker {
  static async runBatch(now = new Date(), batchSize = inventoryConfig.expiryBatchSize): Promise<number> {
    const candidates = await prisma.inventoryReservation.findMany({
      where: { status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
      select: { orderId: true }, distinct: ['orderId'], orderBy: { expiresAt: 'asc' }, take: Math.max(1, Math.min(batchSize, 1000)),
    });
    let released = 0;
    for (const candidate of candidates) {
      released += await transactionWithRetry(async (tx) => {
        await lockOrder(tx, candidate.orderId);
        const due = await tx.inventoryReservation.count({
          where: { orderId: candidate.orderId, status: InventoryReservationStatus.ACTIVE, expiresAt: { lte: now } },
        });
        return due > 0 ? InventoryService.releaseOrder(tx, candidate.orderId, 'EXPIRED') : 0;
      });
    }
    return released;
  }
}

export interface ReconciliationMismatch { productId: string; stored: number; expected: number; stock: number }
export interface InventoryAnomaly {
  type: string;
  orderId: string | null;
  reservationId: string | null;
  productId: string | null;
}


export class InventoryReconciliationService {
  static async auditAnomalies(now = new Date(), limit = inventoryConfig.reconciliationBatchSize): Promise<InventoryAnomaly[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 5000));
    const anomalies = await prisma.$queryRaw<InventoryAnomaly[]>(Prisma.sql`
      SELECT 'ACTIVE_ON_PAID_ORDER' AS type, r.orderId, r.id AS reservationId, r.productId
      FROM inventory_reservation r JOIN ${Prisma.raw('`order`')} o ON o.id = r.orderId
      WHERE r.status = 'ACTIVE' AND o.paymentStatus IN ('paid', 'refunded')
      UNION ALL
      SELECT 'CONSUMED_ON_UNPAID_ORDER', r.orderId, r.id, r.productId
      FROM inventory_reservation r JOIN ${Prisma.raw('`order`')} o ON o.id = r.orderId
      WHERE r.status = 'CONSUMED' AND o.paymentStatus NOT IN ('paid', 'refunded')
      UNION ALL
      SELECT 'OVERDUE_ACTIVE', r.orderId, r.id, r.productId
      FROM inventory_reservation r WHERE r.status = 'ACTIVE' AND r.expiresAt <= ${now}
      UNION ALL
      SELECT 'INVALID_PRODUCT_COUNTS', NULL, NULL, p.id
      FROM product p WHERE p.stockQuantity < 0 OR p.reservedQuantity < 0 OR p.reservedQuantity > p.stockQuantity
      UNION ALL
      SELECT 'SUCCEEDED_PAYMENT_ORDER_UNPAID', p.orderId, NULL, NULL
      FROM payment p JOIN ${Prisma.raw('`order`')} o ON o.id = p.orderId
      WHERE p.status = 'completed' AND o.paymentStatus NOT IN ('paid', 'refunded')
      UNION ALL
      SELECT 'EXPIRED_ORDER_ACTIVE', r.orderId, r.id, r.productId
      FROM inventory_reservation r JOIN ${Prisma.raw('`order`')} o ON o.id = r.orderId
      WHERE o.status = 'expired' AND r.status = 'ACTIVE'
      LIMIT ${boundedLimit}`);
    for (const anomaly of anomalies) logger.error('inventory.reconciliation_anomaly', undefined, { ...anomaly });
    return anomalies;
  }

  static async run(options: { repair?: boolean; batchSize?: number } = {}): Promise<ReconciliationMismatch[]> {
    const client: PrismaClient = prisma;
    await this.auditAnomalies(new Date(), options.batchSize ?? inventoryConfig.reconciliationBatchSize);
    const products = await client.product.findMany({
      select: { id: true, stockQuantity: true, reservedQuantity: true }, orderBy: { id: 'asc' },
      take: Math.max(1, Math.min(options.batchSize ?? inventoryConfig.reconciliationBatchSize, 5000)),
    });
    const mismatches: ReconciliationMismatch[] = [];
    for (const product of products) {
      const aggregate = await client.inventoryReservation.aggregate({
        where: { productId: product.id, status: InventoryReservationStatus.ACTIVE }, _sum: { quantity: true },
      });
      const expected = aggregate._sum.quantity ?? 0;
      if (expected === product.reservedQuantity) continue;
      const mismatch = { productId: product.id, stored: product.reservedQuantity, expected, stock: product.stockQuantity };
      mismatches.push(mismatch);
      logger.error('inventory.reconciliation_mismatch', undefined, mismatch);
      if (options.repair) {
        if (expected < 0 || expected > product.stockQuantity) throw new ValidationError('Refusing unsafe inventory reconciliation repair', mismatch);
        await client.$transaction(async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM product WHERE id = ${product.id} FOR UPDATE`);
          const current = await tx.inventoryReservation.aggregate({
            where: { productId: product.id, status: InventoryReservationStatus.ACTIVE }, _sum: { quantity: true },
          });
          const safeExpected = current._sum.quantity ?? 0;
          const lockedProduct = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
          if (safeExpected > lockedProduct.stockQuantity) throw new ValidationError('Refusing unsafe inventory reconciliation repair', mismatch);
          await tx.product.update({ where: { id: product.id }, data: { reservedQuantity: safeExpected } });
        });
      }
    }
    return mismatches;
  }
}
