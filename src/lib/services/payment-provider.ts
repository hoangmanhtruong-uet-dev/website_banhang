import { createHash } from 'node:crypto';
import prisma from '@/lib/db';

export type ProviderOutcome =
  | 'SUCCEEDED'
  | 'DECLINED'
  | 'FAILED_BEFORE_SIDE_EFFECT'
  | 'UNKNOWN_REQUIRES_RECONCILIATION';

export type ProviderResult =
  | { outcome: 'SUCCEEDED'; transactionId: string }
  | { outcome: 'DECLINED'; code: string }
  | { outcome: 'FAILED_BEFORE_SIDE_EFFECT'; code: string }
  | { outcome: 'UNKNOWN_REQUIRES_RECONCILIATION'; reconciliationReference: string };

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: { orderId: string; userId: string; amount: string; currency: string }, providerIdempotencyKey: string): Promise<ProviderResult>;
  getPaymentByIdempotencyKey(providerIdempotencyKey: string): Promise<ProviderResult | null>;
  getPaymentByTransactionId(transactionId: string): Promise<ProviderResult | null>;
  createRefund(input: { paymentId: string; userId: string; amount: string; currency: string }, providerIdempotencyKey: string): Promise<ProviderResult>;
  getRefund(providerRefundId: string): Promise<ProviderResult | null>;
}

function deterministicId(prefix: string, value: string): string {
  return `${prefix}:${createHash('sha256').update(value).digest('hex')}`;
}

export function buildProviderIdempotencyKey(operation: string, scopeId: string, requestKey: string): string {
  return `${operation}:${createHash('sha256').update(`${scopeId}:${requestKey}`).digest('hex')}`;
}

// The internal wallet is transactional database state, not an external network provider.
// A future SDK adapter must persist UNKNOWN_REQUIRES_RECONCILIATION and query through the lookup methods before retrying.
export class InternalWalletProvider implements PaymentProvider {
  readonly name = 'internal_wallet';

  async createPayment(_input: { orderId: string; userId: string; amount: string; currency: string }, providerIdempotencyKey: string): Promise<ProviderResult> {
    return { outcome: 'SUCCEEDED', transactionId: deterministicId('internal-wallet-txn', providerIdempotencyKey) };
  }

  async getPaymentByIdempotencyKey(providerIdempotencyKey: string): Promise<ProviderResult | null> {
    const payment = await prisma.payment.findUnique({ where: { providerIdempotencyKey } });
    return payment ? this.mapStored(payment.providerOutcome, payment.providerTransactionId) : null;
  }

  async getPaymentByTransactionId(providerTransactionId: string): Promise<ProviderResult | null> {
    const payment = await prisma.payment.findUnique({ where: { providerTransactionId } });
    return payment ? this.mapStored(payment.providerOutcome, payment.providerTransactionId) : null;
  }

  async createRefund(_input: { paymentId: string; userId: string; amount: string; currency: string }, providerIdempotencyKey: string): Promise<ProviderResult> {
    return { outcome: 'SUCCEEDED', transactionId: deterministicId('internal-wallet-refund', providerIdempotencyKey) };
  }

  async getRefund(providerRefundId: string): Promise<ProviderResult | null> {
    const refund = await prisma.refund.findUnique({ where: { providerRefundId } });
    return refund?.providerRefundId ? this.mapStored(refund.providerOutcome, refund.providerRefundId) : null;
  }

  private mapStored(outcome: string, transactionId: string): ProviderResult {
    if (outcome === 'UNKNOWN_REQUIRES_RECONCILIATION') return { outcome, reconciliationReference: transactionId };
    if (outcome === 'DECLINED') return { outcome, code: 'PROVIDER_DECLINED' };
    if (outcome === 'FAILED_BEFORE_SIDE_EFFECT') return { outcome, code: 'PROVIDER_FAILED' };
    return { outcome: 'SUCCEEDED', transactionId };
  }
}

export const internalWalletProvider = new InternalWalletProvider();