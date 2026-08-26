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
  if (process.env.NODE_ENV !== 'production') return;
  throw new ManualWalletMutationDisabledError(operation, route);
}
