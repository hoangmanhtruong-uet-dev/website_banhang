# Idempotency operations runbook

## Runtime model

The implementation uses one MySQL transaction for the claim insert, every domain mutation, response serialization, and the transition to `COMPLETED`.

| Visible state | Transition | Database guarantee | Client behavior |
| --- | --- | --- | --- |
| No row (`NEW`) | insert `PROCESSING` | unique `(scopeId, operation, key)` elects one winner | winner runs the handler |
| `PROCESSING` inside the winner transaction | update to `COMPLETED` | not visible to another connection before commit | no public in-progress/lease workflow exists |
| `COMPLETED` | immutable replay source until expiry | response status/body and domain changes commit atomically | exact status/body replay with `Idempotency-Replayed: true` |
| Any exception before commit | transaction rollback to no row | claim and all domain mutations disappear together | the same key may be retried as a new attempt |

A committed `PROCESSING` row is an invariant violation, not a recoverable lease. The service returns `IDEMPOTENCY_STATE_INVALID` and cleanup deliberately preserves it for investigation. `FAILED`, owner tokens, stale takeover, and lease renewal are intentionally absent because this is not a claim-first/two-transaction design.

### Concurrent claim timeline

1. Request A inserts the unique claim and performs domain work in transaction A.
2. Request B attempts the same insert. MySQL waits or selects a deadlock victim; B never enters the domain handler.
3. A stores the response and commits.
4. If B receives Prisma `P2034`, it retries the complete operation in a fresh transaction (maximum four attempts, no sleeps).
5. If B receives `P2002`, Prisma has rolled that transaction back. B reads the committed record using a new standalone query, validates method and request hash, and replays it. A payload mismatch is HTTP 409.

## Local and CI verification

Run the complete disposable-database suite with:

```bash
npm run test:idempotency:integration
```

The runner refuses any database whose name does not end in `_test`, starts `docker-compose.integration.yml`, waits for MySQL health, runs `prisma migrate deploy`, generates Prisma Client, executes the non-skippable integration test, and removes its container/volume. Set `INTEGRATION_DB_MANAGED=1` only when CI already supplies the dedicated MySQL service.

Cleanup supports inspection before deletion:

```bash
npm run idempotency:cleanup -- --dry-run
```

Cleanup is bounded, deletes only expired `COMPLETED` records, and uses `(status, expiresAt)`. Payment and refund retention values are longer than the general order retention and are set by their routes.

## Migration deployment and recovery

Prisma Migrate has no automatic down migration. Treat migration deployment as roll-forward:

1. Back up the target database and verify restore before deployment.
2. Run `npx prisma migrate status`; review `_prisma_migrations`, especially checksums for historical migrations whose table-name casing was normalized for Linux MySQL.
3. Apply `npx prisma migrate deploy` in staging, then run `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` and inspect `information_schema` constraints/indexes.
4. Deploy production only after the same checks pass. Never use `migrate reset` outside the disposable test database.
5. On failure, restore the backup or create a corrective forward migration. Use `prisma migrate resolve --applied/--rolled-back` only after manually proving the physical schema matches that decision.

For an existing case-sensitive MySQL installation that contains PascalCase legacy tables, do not blindly apply the normalized history. Inventory the actual names, perform explicit verified `RENAME TABLE` operations in a maintenance window, then reconcile migration history. Renaming only by case may require a two-step temporary name depending on `lower_case_table_names`.

## Payment-provider boundary

`internal_wallet` is the only active provider. Its IDs are deterministic and all of its monetary state is in the same MySQL transaction, so rollback is sufficient for this provider only.

The provider contract exposes idempotency-key and transaction-ID lookups and classifies `SUCCEEDED`, `DECLINED`, `FAILED_BEFORE_SIDE_EFFECT`, and `UNKNOWN_REQUIRES_RECONCILIATION`. No external adapter is wired into the transactional services. An external SDK must not be substituted there: an unknown network result could have charged successfully even when MySQL rolls back.

Before enabling an external provider, add a durable provider-operation/outbox record committed before the network call, persist `UNKNOWN_REQUIRES_RECONCILIATION`, return a safe pending/202 response, and reconcile by provider idempotency key or transaction ID. Unknown outcomes must never be automatically charged/refunded again and their idempotency records must not be cleaned up. Queue/outbox delivery and notification deduplication remain deployment prerequisites for that path.

## Incident checks

For an idempotency incident, log/search only the hashed key emitted by the service; never log the raw key or stored response. Check the corresponding record, resource ID, request hash, transaction retry logs, and provider identifiers. A committed `PROCESSING` row should be preserved, alerted, and investigated rather than deleted or taken over.