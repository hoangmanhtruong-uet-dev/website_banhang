import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient, type SellerFulfillment } from '@prisma/client';
import prisma from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { TransactionClient } from '@/lib/services/idempotency.service';
import { InventoryService } from '@/lib/services/inventory.service';
import { syncOrderFromFulfillmentsInTransaction, type OrderTransitionActor } from '@/lib/services/order-state.service';

export const FULFILLMENT_STATUS = Object.freeze({
  PENDING: 'pending', PAID: 'paid', CONFIRMED: 'confirmed', PACKING: 'packing',
  SHIPPING: 'shipping', DELIVERED: 'delivered', CANCELLED: 'cancelled',
});

export type FulfillmentActor =
  | { type: 'SELLER'; userId: string }
  | { type: 'SHIPPER'; userId: string }
  | { type: 'ADMIN'; userId: string };

export interface TransitionFulfillmentInput {
  fulfillmentId: string;
  targetStatus: 'confirmed' | 'packing' | 'shipping' | 'delivered';
  actor: FulfillmentActor;
  reason?: string;
  metadata?: Readonly<Record<string, unknown>>;
  idempotencyKey: string;
}

const allowedEdges: Readonly<Record<FulfillmentActor['type'], readonly string[]>> = Object.freeze({
  SELLER: ['paid->confirmed', 'confirmed->packing'],
  SHIPPER: ['packing->shipping', 'shipping->delivered'],
  ADMIN: ['paid->confirmed', 'confirmed->packing', 'packing->shipping', 'shipping->delivered'],
});

function fulfillmentError(code: string, message: string, statusCode: number): AppError {
  return new AppError(message, statusCode, code, true);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function requestHash(input: TransitionFulfillmentInput): string {
  return createHash('sha256').update(canonical({ fulfillmentId: input.fulfillmentId, targetStatus: input.targetStatus, actor: input.actor, reason: input.reason ?? null, metadata: input.metadata ?? null })).digest('hex');
}

function safeMetadata(value?: Readonly<Record<string, unknown>>): string | undefined {
  if (!value) return undefined;
  const filtered = Object.fromEntries(Object.entries(value).filter(([key]) => !/password|secret|token|authorization|card|cvv/i.test(key)));
  return canonical(filtered).slice(0, 8000);
}

function transitionData(input: TransitionFulfillmentInput, now: Date): Prisma.SellerFulfillmentUncheckedUpdateManyInput {
  const data: Prisma.SellerFulfillmentUncheckedUpdateManyInput = { status: input.targetStatus, statusVersion: { increment: 1 } };
  if (input.targetStatus === 'confirmed') data.confirmedAt = now;
  if (input.targetStatus === 'packing') data.packingStartedAt = now;
  if (input.targetStatus === 'shipping') {
    data.shippedAt = now;
    if (typeof input.metadata?.trackingNumber === 'string') data.trackingNumber = input.metadata.trackingNumber;
    if (typeof input.metadata?.shippingProvider === 'string') data.shippingProvider = input.metadata.shippingProvider;
    if (typeof input.metadata?.estimatedDelivery === 'string') data.estimatedDelivery = new Date(input.metadata.estimatedDelivery);
    if (input.actor.type === 'SHIPPER' && input.metadata?.assignSelf === true) data.shipperId = input.actor.userId;
  }
  if (input.targetStatus === 'delivered') data.deliveredAt = now;
  return data;
}

async function transitionInTransaction(tx: TransactionClient, input: TransitionFulfillmentInput): Promise<SellerFulfillment> {
  if (!input.idempotencyKey || input.idempotencyKey.length > 191) throw fulfillmentError('INVALID_FULFILLMENT_TRANSITION', 'A bounded idempotency key is required', 400);
  const hash = requestHash(input);
  const replay = await tx.sellerFulfillmentTransition.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (replay) {
    if (replay.requestHash !== hash) throw fulfillmentError('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with a different transition', 409);
    return tx.sellerFulfillment.findUniqueOrThrow({ where: { id: replay.fulfillmentId } });
  }

  const reference = await tx.sellerFulfillment.findUnique({ where: { id: input.fulfillmentId }, select: { orderId: true } });
  if (!reference) throw fulfillmentError('FULFILLMENT_NOT_FOUND', 'Fulfillment not found', 404);
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw('`order`')} WHERE id = ${reference.orderId} FOR UPDATE`);
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM seller_fulfillment WHERE id = ${input.fulfillmentId} FOR UPDATE`);
  const fulfillment = await tx.sellerFulfillment.findUnique({ where: { id: input.fulfillmentId }, include: { order: true } });
  if (!fulfillment) throw fulfillmentError('FULFILLMENT_NOT_FOUND', 'Fulfillment not found', 404);
  const edge = `${fulfillment.status}->${input.targetStatus}`;
  if (!allowedEdges[input.actor.type].includes(edge)) throw fulfillmentError('ACTOR_NOT_ALLOWED', `${input.actor.type} cannot perform ${edge}`, 403);
  if (input.actor.type === 'SELLER' && fulfillment.sellerId !== input.actor.userId) throw fulfillmentError('ACTOR_NOT_ALLOWED', 'Seller does not own this fulfillment', 403);
  if (input.actor.type === 'SHIPPER') {
    const assigningSelf = fulfillment.status === 'packing' && input.targetStatus === 'shipping' && !fulfillment.shipperId && input.metadata?.assignSelf === true;
    if (fulfillment.shipperId !== input.actor.userId && !assigningSelf) throw fulfillmentError('ACTOR_NOT_ALLOWED', 'Shipment is not assigned to this shipper', 403);
  }
  const isCod = fulfillment.order.paymentMethod === 'COD';
  if (!isCod && fulfillment.order.paymentStatus !== 'paid') throw fulfillmentError('PAYMENT_NOT_COMPLETED', 'Fulfillment requires a paid order', 422);
  if (input.targetStatus === 'shipping' && !fulfillment.trackingNumber && typeof input.metadata?.trackingNumber !== 'string') {
    throw fulfillmentError('TRACKING_REQUIRED', 'Tracking number is required before shipping', 422);
  }

  if (isCod && ['SELLER', 'ADMIN'].includes(input.actor.type) && input.targetStatus === 'confirmed') {
    await InventoryService.consumeForCodFulfillment(tx, fulfillment.id);
  }
  const now = new Date();
  const updated = await tx.sellerFulfillment.updateMany({
    where: { id: fulfillment.id, status: fulfillment.status, statusVersion: fulfillment.statusVersion },
    data: transitionData(input, now),
  });
  if (updated.count !== 1) throw fulfillmentError('FULFILLMENT_STATUS_CONFLICT', 'Fulfillment changed concurrently', 409);
  const actorId = input.actor.userId;
  await tx.sellerFulfillmentTransition.create({ data: {
    fulfillmentId: fulfillment.id, fromStatus: fulfillment.status, toStatus: input.targetStatus,
    actorType: input.actor.type, actorId, reason: input.reason?.trim(), metadata: safeMetadata(input.metadata),
    idempotencyKey: input.idempotencyKey, requestHash: hash,
  } });
  await tx.domainAuditLog.create({ data: {
    action: 'FULFILLMENT_STATUS_TRANSITION', actorId, entityType: 'SellerFulfillment', entityId: fulfillment.id,
    details: canonical({ orderId: fulfillment.orderId, fromStatus: fulfillment.status, toStatus: input.targetStatus, idempotencyKey: input.idempotencyKey }),
  } });
  await syncOrderFromFulfillmentsInTransaction(tx, fulfillment.orderId, input.actor as OrderTransitionActor, input.idempotencyKey);
  return tx.sellerFulfillment.findUniqueOrThrow({ where: { id: fulfillment.id } });
}

export class FulfillmentService {
  static async transition(input: TransitionFulfillmentInput, client: PrismaClient = prisma): Promise<SellerFulfillment> {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        return await client.$transaction((tx) => transitionInTransaction(tx, input), { maxWait: 10_000, timeout: 20_000 });
      } catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === 4) throw error;
      }
    }
    throw fulfillmentError('FULFILLMENT_STATUS_CONFLICT', 'Fulfillment transition retry limit exceeded', 409);
  }

  static async transitionOrderFulfillments(input: {
    orderId: string;
    targetStatus: TransitionFulfillmentInput['targetStatus'];
    actor: Extract<FulfillmentActor, { type: 'ADMIN' }>;
    reason?: string;
    metadata?: Readonly<Record<string, unknown>>;
    idempotencyKey: string;
  }, client: PrismaClient = prisma) {
    const previousByTarget: Readonly<Record<TransitionFulfillmentInput['targetStatus'], string>> = {
      confirmed: 'paid', packing: 'confirmed', shipping: 'packing', delivered: 'shipping',
    };
    return client.$transaction(async (tx) => {
      const fulfillments = await tx.sellerFulfillment.findMany({
        where: { orderId: input.orderId, status: previousByTarget[input.targetStatus] },
        select: { id: true }, orderBy: { id: 'asc' },
      });
      if (fulfillments.length === 0) throw fulfillmentError('INVALID_FULFILLMENT_TRANSITION', 'No fulfillment can perform this action', 409);
      for (const fulfillment of fulfillments) {
        await transitionInTransaction(tx, { ...input, fulfillmentId: fulfillment.id, idempotencyKey: `admin:${createHash('sha256').update(`${input.idempotencyKey}:${fulfillment.id}`).digest('hex')}` });
      }
      return tx.order.findUniqueOrThrow({ where: { id: input.orderId }, include: { fulfillments: true } });
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}
