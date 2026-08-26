import { logger } from '@/lib/logger';
import {
  ManualWalletMutationDisabledError,
  assertManualWalletMutationAllowed,
  type ManualWalletMutation,
} from '@/lib/security/manual-wallet-mutation-policy';

export function enforceManualWalletMutationPolicy(
  operation: ManualWalletMutation,
  route: string,
): void {
  try {
    assertManualWalletMutationAllowed(operation, route);
  } catch (error) {
    if (error instanceof ManualWalletMutationDisabledError) {
      logger.warn('security.manual_wallet_mutation_blocked', {
        operation: error.operation,
        route: error.route,
      });
    }
    throw error;
  }
}
