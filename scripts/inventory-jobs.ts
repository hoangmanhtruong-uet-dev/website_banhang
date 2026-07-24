import prisma from '../src/lib/db';
import { InventoryExpiryWorker, InventoryReconciliationService } from '../src/lib/services/inventory.service';

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'expire';
  if (command === 'expire') {
    const released = await InventoryExpiryWorker.runBatch();
    console.log(JSON.stringify({ command, released }));
    return;
  }
  if (command === 'reconcile' || command === 'repair') {
    const mismatches = await InventoryReconciliationService.run({ repair: command === 'repair' });
    console.log(JSON.stringify({ command, mismatchCount: mismatches.length, mismatches }));
    if (command === 'reconcile' && mismatches.length > 0) process.exitCode = 2;
    return;
  }
  throw new Error(`Unknown inventory job: ${command}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
