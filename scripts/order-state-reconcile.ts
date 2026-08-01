import { OrderStateReconciliationService } from '../src/lib/services/order-state-reconciliation';
import prisma from '../src/lib/db';

async function main(): Promise<void> {
  const repair = process.argv.includes('--repair');
  if (repair) throw new Error('Automatic order-state repair is intentionally disabled; investigate anomalies and use audited domain commands.');
  const anomalies = await OrderStateReconciliationService.audit();
  console.log(JSON.stringify({ mode: 'dry-run', anomalyCount: anomalies.length, anomalies }, null, 2));
  if (anomalies.length > 0) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());