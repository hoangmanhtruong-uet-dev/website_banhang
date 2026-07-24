import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db';
import { IdempotencyConflictError, IdempotencyStateError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashForLog, requestFingerprint } from '@/lib/idempotency';

export type TransactionClient = Prisma.TransactionClient;

export interface IdempotentResponse<T> {
  status: number;
  body: T;
  resourceType?: string;
  resourceId?: string;
}

export interface IdempotencyOutcome<T> extends IdempotentResponse<T> {
  replayed: boolean;
}

interface ExecuteOptions<T> {
  scopeId: string;
  operation: string;
  method: string;
  key: string;
  request: unknown;
  retentionHours?: number;
  signal?: AbortSignal;
  handler: (tx: TransactionClient) => Promise<IdempotentResponse<T>>;
}

const DEFAULT_RETENTION_HOURS = 72;
const MAX_TRANSACTION_ATTEMPTS = 4;

function retentionDate(hours: number): Date {
  const safeHours = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24 * 365) : DEFAULT_RETENTION_HOURS;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + safeHours);
  return expiresAt;
}

function parseStoredBody<T>(body: string | null): T {
  if (!body) throw new IdempotencyStateError();
  return JSON.parse(body) as T;
}

function isPrismaError(error: unknown, code: string): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export class IdempotencyService {
  static async execute<T>(options: ExecuteOptions<T>): Promise<IdempotencyOutcome<T>> {
    if (options.signal?.aborted) throw options.signal.reason ?? new Error('Request aborted before idempotency claim');
    // Once the claim transaction starts it is intentionally non-cancellable: commit or rollback atomically.
    const requestHash = requestFingerprint(options.request);
    const keyHash = hashForLog(options.key);
    const startedAt = Date.now();

    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      let claimCreated = false;
      try {
        const result = await prisma.$transaction(async (tx) => {
          const record = await tx.idempotencyRecord.create({
            data: {
              key: options.key,
              scopeId: options.scopeId,
              operation: options.operation,
              method: options.method.toUpperCase(),
              requestHash,
              expiresAt: retentionDate(options.retentionHours ?? Number(process.env.IDEMPOTENCY_RETENTION_HOURS || DEFAULT_RETENTION_HOURS)),
            },
          });
          claimCreated = true;

          const response = await options.handler(tx);
          const responseBody = JSON.stringify(response.body);
          await tx.idempotencyRecord.update({
            where: { id: record.id },
            data: {
              status: 'COMPLETED', responseStatus: response.status, responseBody,
              resourceType: response.resourceType, resourceId: response.resourceId, completedAt: new Date(),
            },
          });
          return { ...response, body: JSON.parse(responseBody) as T, replayed: false };
        }, { maxWait: 10_000, timeout: 30_000 });

        logger.info('idempotency.completed', {
          operation: options.operation, keyHash, attempt, durationMs: Date.now() - startedAt,
        });
        return result;
      } catch (error: unknown) {
        // P2034 means MySQL rolled the entire transaction back. A fresh transaction is required.
        if (isPrismaError(error, 'P2034') && attempt < MAX_TRANSACTION_ATTEMPTS) {
          logger.warn('idempotency.transaction_retry', { operation: options.operation, keyHash, attempt });
          continue;
        }
        if (!claimCreated && isPrismaError(error, 'P2002')) {
          // The failed insert transaction is already rolled back by Prisma. Replay is read using a new query.
          const existing = await prisma.idempotencyRecord.findUnique({
            where: { scopeId_operation_key: { scopeId: options.scopeId, operation: options.operation, key: options.key } },
          });
          if (!existing) throw error;
          if (existing.method !== options.method.toUpperCase() || existing.requestHash !== requestHash) {
            logger.warn('idempotency.conflict', { operation: options.operation, keyHash });
            throw new IdempotencyConflictError();
          }
          // PROCESSING is never committed by this all-in-one transaction model.
          if (existing.status !== 'COMPLETED' || !existing.responseBody) throw new IdempotencyStateError();
          logger.info('idempotency.replayed', { operation: options.operation, keyHash });
          return {
            status: existing.responseStatus ?? 200,
            body: parseStoredBody<T>(existing.responseBody),
            resourceType: existing.resourceType ?? undefined,
            resourceId: existing.resourceId ?? undefined,
            replayed: true,
          };
        }
        throw error;
      }
    }
    throw new IdempotencyStateError('Idempotency transaction retry limit exceeded.');
  }

  static async cleanup(batchSize = 500, client: PrismaClient = prisma, dryRun = false): Promise<number> {
    const expired = await client.idempotencyRecord.findMany({
      where: { expiresAt: { lt: new Date() }, status: 'COMPLETED' },
      select: { id: true },
      take: Math.max(1, Math.min(batchSize, 5_000)),
      orderBy: { expiresAt: 'asc' },
    });
    if (expired.length === 0 || dryRun) return expired.length;
    const result = await client.idempotencyRecord.deleteMany({ where: { id: { in: expired.map((record) => record.id) } } });
    logger.info('idempotency.cleanup', { deleted: result.count });
    return result.count;
  }
}