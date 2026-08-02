import { type NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  action: z.string().trim().max(96).optional(),
  entityType: z.string().trim().max(64).optional(),
  actorId: z.string().trim().max(191).optional(),
});

function safeDetails(details: string | null): unknown {
  if (!details) return null;
  try {
    const value = JSON.parse(details) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /password|secret|token|authorization|card|cvv/i.test(key) ? '[REDACTED]' : item,
    ]));
  } catch {
    return details.slice(0, 1000);
  }
}

export const dynamic = 'force-dynamic';

export const GET = createHandler(async (request: NextRequest) => {
  await requireAdmin();
  const url = new URL(request.url);
  const input = querySchema.parse(Object.fromEntries(url.searchParams));
  const where = {
    ...(input.action ? { action: { contains: input.action } } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.actorId ? { actorId: input.actorId } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.domainAuditLog.count({ where }),
    prisma.domainAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (input.page - 1) * input.limit, take: input.limit }),
  ]);
  return { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit), rows: rows.map((row) => ({ ...row, details: safeDetails(row.details) })) };
});
