import os from 'node:os';
import { randomUUID } from 'node:crypto';
import prisma from '../src/lib/db';
import { logger } from '../src/lib/logger';
import { OutboxConsumerRegistry } from '../src/lib/services/outbox-consumers';
import { OutboxDispatcher } from '../src/lib/services/outbox-dispatcher';
import { OutboxWorker } from '../src/lib/services/outbox-worker';

const command = process.argv[2] ?? 'worker';
const workerId = `${os.hostname()}:${process.pid}:${randomUUID()}`;
const registry = new OutboxConsumerRegistry(prisma);
const dispatcher = new OutboxDispatcher(prisma, registry, { workerId });

async function main(): Promise<void> {
  if (command === 'once') {
    const result = await dispatcher.dispatchOnce();
    console.log(JSON.stringify(result));
    return;
  }
  if (command !== 'worker') throw new Error(`Unknown outbox command: ${command}`);
  const worker = new OutboxWorker(dispatcher, prisma, { workerId });
  let shutdown: Promise<void> | null = null;
  const stop = (signal: string) => {
    if (shutdown) return;
    logger.info('outbox.shutdown_started', { workerId, signal });
    shutdown = worker.stop().then(() => undefined);
  };
  process.once('SIGTERM', () => stop('SIGTERM'));
  process.once('SIGINT', () => stop('SIGINT'));
  await worker.start();
  logger.info('outbox.worker_ready', { workerId });
  while (!shutdown) await new Promise((resolve) => setTimeout(resolve, 1000));
  await shutdown;
}

main()
  .catch((error: unknown) => {
    logger.error('outbox.cli_failed', error, { workerId, command });
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
