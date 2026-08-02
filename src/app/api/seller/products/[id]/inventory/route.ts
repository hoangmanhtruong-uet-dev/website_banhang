import { Prisma, type PrismaClient } from '@prisma/client';
import { type NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { canAccessSeller, getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { inventoryAdjustmentSchema } from '@/lib/validations';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async request => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const key = request.headers.get('idempotency-key');
    if (!key || key.length > 191) throw new ValidationError('Idempotency-Key hợp lệ là bắt buộc');
    const input = inventoryAdjustmentSchema.parse(await request.json());
    const { id } = await context.params;
    return prisma.$transaction(async (tx: Tx) => {
      const replay = await tx.inventoryMovement.findUnique({ where: { idempotencyKey: key }, include: { product: true } });
      if (replay) return replay.product;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM product WHERE id = ${id} FOR UPDATE`);
      const product = await tx.product.findFirst({ where: { id, sellerId: session.userId, deletedAt: null } });
      if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');
      const next = product.stockQuantity + input.quantityDelta;
      if (next < product.reservedQuantity || next < 0) throw new ConflictError('Tồn kho mới không được thấp hơn lượng đang giữ');
      const updated = await tx.product.update({ where: { id }, data: { stockQuantity: next, inStock: next > product.reservedQuantity } });
      await tx.inventoryMovement.create({ data: { productId: id, actorId: session.userId, type: 'ADJUSTMENT', quantityDelta: input.quantityDelta, stockBefore: product.stockQuantity, stockAfter: next, reason: input.reason, idempotencyKey: key } });
      return updated;
    });
  })(req);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return createHandler(async () => {
    const session = await getSession();
    if (!canAccessSeller(session) || !session.isSeller) throw new AuthorizationError('Seller access required');
    const { id } = await context.params;
    const product = await prisma.product.findFirst({ where: { id, sellerId: session.userId, deletedAt: null }, select: { id: true } });
    if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');
    return prisma.inventoryMovement.findMany({ where: { productId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  })(req);
}