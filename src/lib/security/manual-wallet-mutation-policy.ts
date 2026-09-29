import { AppError } from '@/lib/errors';

export type ManualWalletMutation = 'demo-top-up' | 'admin-balance-adjustment';

export class ManualWalletMutationDisabledError extends AppError {
  constructor(
    public readonly operation: ManualWalletMutation,
    public readonly route: string,
  ) {
    // A 404 keeps development-only money mutation endpoints undiscoverable in production.
    super('Wallet balance mutation is not available.', 404, 'MANUAL_WALLET_MUTATION_DISABLED');
  }
}

export function assertManualWalletMutationAllowed(
  operation: ManualWalletMutation,
  route: string,
): void {
  // Allow users to top up their demo wallet even in production to test the checkout flow.
  if (operation === 'demo-top-up') return;

  // Block other manual balance adjustments (e.g. admin actions) in production.
  if (process.env.NODE_ENV !== 'production') return;
  throw new ManualWalletMutationDisabledError(operation, route);
}
