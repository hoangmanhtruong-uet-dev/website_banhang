import prisma from '../src/lib/db';
import { IdempotencyService } from '../src/lib/services/idempotency.service';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  let total = 0;
  while (true) {
    const affected = await IdempotencyService.cleanup(500, prisma, dryRun);
    total += affected;
    if (dryRun || affected < 500) break;
  }
  console.log(JSON.stringify({ event: 'idempotency.cleanup.complete', dryRun, affected: total }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Idempotency cleanup failed');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());