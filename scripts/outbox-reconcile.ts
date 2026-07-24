import prisma from '../src/lib/db';
import { OutboxReconciliationService } from '../src/lib/services/outbox-reconciliation';

async function main(): Promise<void> {
  const repair = process.argv.includes('--repair');
  const anomalies = repair
    ? await OutboxReconciliationService.repair(prisma, 'system:outbox-reconcile-cli')
    : await OutboxReconciliationService.audit(prisma);
  console.log(JSON.stringify({ mode: repair ? 'repair' : 'dry-run', anomalyCount: anomalies.length, anomalies }, null, 2));
  if (!repair && anomalies.length > 0) process.exitCode = 2;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
