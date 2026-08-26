import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { requireIdempotencyKey } from '@/lib/idempotency';
import { enforceManualWalletMutationPolicy } from '@/lib/security/manual-wallet-mutation-guard';
import { IdempotencyService } from '@/lib/services/idempotency.service';
import { DEFAULT_CURRENCY, Money, parseMoneyInput } from '@/lib/utils/money';


const topUpSchema = z.object({
  amount: z.string()
    .regex(/^(0|[1-9]\d*)$/, 'Số tiền nạp phải là số nguyên dương')
    .refine((value) => {
      if (!/^(0|[1-9]\d*)$/.test(value)) return false;
      const amount = BigInt(value);
      return amount >= 100000n && amount <= 100000000n;
    }, 'Số tiền nạp phải từ 100.000 ₫ đến 100.000.000 ₫')
    .transform((value) => parseMoneyInput(value, { allowZero: false, field: 'amount' })),
});

export const GET = createHandler(async () => {
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { balance: true, currency: true, paymentPinHash: true },
  });
  if (!user) throw new NotFoundError('Không tìm thấy người dùng');
  return { balance: Money.serialize(user.balance), currency: user.currency, hasPaymentPin: Boolean(user.paymentPinHash) };
});

export const POST = createHandler(async (req: NextRequest) => {
  enforceManualWalletMutationPolicy('demo-top-up', '/api/user/balance');
  const session = await getSession();
  if (!session) throw new AuthenticationError();
  const idempotencyKey = requireIdempotencyKey(req.headers);
  const parsed = topUpSchema.parse(await req.json());
  const referenceId = createHash('sha256').update(`${session.userId}:${idempotencyKey}`).digest('hex');

  const outcome = await IdempotencyService.execute({
    scopeId: session.userId,
    operation: 'wallet:demo-topup',
    method: req.method,
    signal: req.signal,
    key: idempotencyKey,
    request: parsed,
    handler: async (tx) => {
      // Defense in depth: keep the invariant next to the balance write if this
      // transaction is later extracted into or reused by an internal service.
      enforceManualWalletMutationPolicy('demo-top-up', '/api/user/balance');
      await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM user WHERE id = ${session.userId} FOR UPDATE`);
      const wallet = await tx.user.findUnique({ where: { id: session.userId }, select: { balance: true, currency: true } });
      if (!wallet) throw new NotFoundError('Không tìm thấy ví');
      const balanceAfter = Money.round(Money.add(wallet.balance, parsed.amount));
      await tx.user.update({ where: { id: session.userId }, data: { balance: balanceAfter } });
      await tx.walletLedger.create({ data: {
        userId: session.userId,
        deterministicKey: `demo-topup:${referenceId}`,
        referenceType: 'DemoTopUp',
        referenceId,
        amount: parsed.amount,
        balanceBefore: wallet.balance,
        balanceAfter,
        currency: wallet.currency || DEFAULT_CURRENCY,
        entryType: 'DEMO_TOPUP',
      } });
      return {
        status: 201,
        body: { balance: Money.serialize(balanceAfter), currency: wallet.currency, amount: Money.serialize(parsed.amount) },
        resourceType: 'wallet_topup',
        resourceId: referenceId,
      };
    },
  });

  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: outcome.replayed ? { 'Idempotency-Replayed': 'true' } : undefined,
  });
});

export async function PATCH() {
  return NextResponse.json({ error: 'Direct wallet mutation is disabled; use demo top-up' }, { status: 405 });
}
