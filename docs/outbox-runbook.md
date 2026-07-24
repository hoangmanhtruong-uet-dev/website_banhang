# Transactional outbox runbook

MySQL 8 is the source of truth for claim ownership, consumer deduplication, refund state, wallet credits, notification delivery, heartbeat, and audit history. This deployment does not require Redis and must not replace database leases or unique constraints with process-local state.

## Processes and schedules

- Run `npm run outbox:worker` as a dedicated long-running process with the same release version as the web application. Run at least two replicas for availability.
- Run `npm run inventory:expire` every minute as a fallback sweep.
- Run `npm run outbox:reconcile` every 5-10 minutes. Exit code 2 means anomalies were found; it is still a dry-run.
- Run `npm run inventory:reconcile` every 10-15 minutes. It is a dry-run by default.
- Run `npm run outbox:repair` or `npm run inventory:repair` only after an operator reviews the anomaly. Repairs write audit rows.
- `npm run outbox:dispatch-once` is safe for cron deployments and local verification. Concurrent invocations use `FOR UPDATE SKIP LOCKED` and guarded leases.

Do not start polling from a Next.js request handler or serverless function. The continuous worker belongs in a separate process/container.

## Configuration

| Variable | Default | Meaning |
| --- | ---: | --- |
| `OUTBOX_BATCH_SIZE` | 50 | Maximum events per claim transaction |
| `OUTBOX_POLL_INTERVAL_MS` | 1000 | Delay between worker polls |
| `OUTBOX_LEASE_SECONDS` | 60 | Lease duration; renewed every third of this duration |
| `OUTBOX_MAX_ATTEMPTS` | 10 | Default attempts before dead-letter |
| `OUTBOX_BACKOFF_BASE_MS` | 1000 | Initial retry delay |
| `OUTBOX_BACKOFF_MAX_MS` | 300000 | Maximum retry delay |
| `OUTBOX_CONCURRENCY` | 5 | Consumers per worker batch |
| `OUTBOX_SHUTDOWN_TIMEOUT_MS` | 30000 | Maximum graceful drain time |
| `OUTBOX_HEARTBEAT_TTL_SECONDS` | 15 | Database heartbeat validity |
| `OUTBOX_DEAD_LETTER_CRITICAL_THRESHOLD` | 1 | Refund dead-letter count that fails readiness; 0 disables |
| `OUTBOX_REQUIRED_WORKER_VERSION` | unset | Optional exact version checked by readiness |
| `OUTBOX_REQUIRED_WORKER_ID_PREFIX` | unset | Optional deployment identity prefix |

The maximum supported consumer runtime is not bounded by the initial lease because the dispatcher renews it. If the database cannot renew the lease, the old worker is forbidden from completing or failing the row; a new worker reclaims it and durable consumer deduplication prevents duplicate database effects.

## Deployment and shutdown

1. Apply migrations before starting the new worker image: `npx prisma migrate deploy`.
2. Start worker replicas and wait for `/api/health/ready` to return 200.
3. Route traffic to the matching web release.
4. Send `SIGTERM` for shutdown. The worker stops claiming, waits for the active batch, persists `stopped`, then exits.
5. If drain exceeds `OUTBOX_SHUTDOWN_TIMEOUT_MS`, the process exits failed; leases recover automatically.

Readiness fails closed when the database is unavailable, no non-expired ready heartbeat exists, identity/version is wrong, the runtime has failed, or critical refund dead-letters meet the configured threshold.

## Dead letters

- List: `GET /api/admin/outbox/dead-letters?limit=100` with an authenticated admin session.
- Requeue: `POST /api/admin/outbox/dead-letters/{eventId}/requeue` with an authenticated admin session.
- Requeue is rejected if any durable processed-event row exists or the event is no longer dead-lettered.
- Requeue resets attempts and the lease, schedules `RETRY`, and writes `OUTBOX_DEAD_LETTER_REQUEUED` to `domain_audit_log`.
- The API deliberately omits raw payloads and stack traces. Inspect sensitive records directly under audited database access if needed.

## Late-payment refund operations

1. A successful webhook after reservation expiry persists the payment as `SUCCEEDED_LATE`, moves the order to `payment_review`/`paid_late`, and inserts one deterministic late-payment outbox event in the same transaction.
2. An admin approves with `POST /api/admin/orders/{orderId}/refund-approval`. The request accepts no amount; the server calculates the remaining payment amount and validates VND.
3. Approval creates one `PENDING` refund, moves payment/order to refund-pending states, writes audit history, and inserts one `REFUND_REQUIRED` event atomically.
4. The wallet consumer locks payment, refund, and user in stable order; credits once; inserts a uniquely keyed ledger row; updates payment/refund/order; records durable consumption; and inserts one notification event in one transaction.

## Notification provider contract

The bundled log adapter is suitable for development. A production adapter must forward `providerIdempotencyKey` to a provider that guarantees idempotent sends. The delivery row is persisted before calling the provider. It is marked `sent` only after provider acknowledgement. If a timeout leaves the result unknown, retry uses the same provider key so the provider returns the original result instead of sending again. Provider credentials and raw recipient values must never be logged.

## Monitoring

Admin metrics are available at `GET /api/admin/outbox/metrics`. Collect these database gauges:

- pending, retry, processing, and dead-letter totals;
- oldest pending age;
- refund required/succeeded/failed and late-payment totals;
- notification delivery failure total.

Structured logs add batch success/failure counts, stale lease recovery totals, consumer duration, attempt number, event ID/type, worker ID, and error code. Alert on:

- any `REFUND_REQUIRED` dead-letter;
- oldest pending age above the business SLO;
- repeated stale lease recovery;
- failed/stale heartbeat;
- refund or ledger reconciliation anomalies.

## Verification

Run before release:

```text
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

The integration command starts MySQL 8, applies migrations on a blank database, upgrades a second database containing a legacy outbox row, runs real concurrency/race tests, and reports skipped tests. A release is not accepted if any integration test is skipped.
