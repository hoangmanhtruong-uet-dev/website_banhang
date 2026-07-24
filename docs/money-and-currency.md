# Money and currency

## Contract

All persisted monetary values use MySQL `DECIMAL(19,4)` and Prisma `Decimal`. API monetary values are canonical fixed-scale strings such as `"125000.0000"`; currency is the uppercase ISO 4217 code `"VND"`. This phase supports VND only and never performs implicit currency conversion.

`Product.price`, `Product.originalPrice`, voucher values, wallet balance, order snapshots, payment/refund amounts, and wallet-ledger amounts use `DECIMAL(19,4)`. `Product.rating` remains `Float` because it is a score, not money. `Voucher.discountValue` is shared by fixed and percentage vouchers, so it remains `DECIMAL(19,4)`; percentage vouchers are additionally constrained by application validation to `0 < value <= 100`.

Floating point is not suitable for accounting because values such as `0.1` and `0.2` are not represented exactly by IEEE-754. `toFixed()` only formats an already-inexact number and is not a correctness strategy.

## Domain usage

Use `src/lib/utils/money.ts` on the server:

```ts
const lineTotal = Money.multiply(product.price, quantity);
const total = Money.round(Money.subtract(subtotal, discount));
if (Money.compare(refund, refundable) > 0) throw new Error('over-refund');
const responseAmount = Money.serialize(total); // "125000.0000"
```

`Money.toDecimal` accepts a `Prisma.Decimal`, decimal string, bigint, or a legacy safe-integer number. Arbitrary JavaScript decimal numbers are rejected at the boundary. `parseMoneyInput` rejects whitespace, separators, scientific notation, excess precision, excess scale, negative values unless explicitly allowed, and unsupported input types.

Browser display/cart previews use `src/lib/utils/client-money.ts`, which performs fixed-scale arithmetic with `bigint`. The server always reloads product prices and recalculates the order; client price or total is never authoritative.

## Rounding

Intermediate Decimal calculations are not rounded. Persisted business-boundary amounts are normalized to scale 4 with explicit `ROUND_HALF_UP`. VND is displayed with zero decimal places, while stored/API values retain four places. Negative zero serializes as `"0.0000"`.

Input with more than four decimal places is rejected rather than silently rounded. The one-time legacy `DOUBLE` backfill rounds to four places only after preflight proves values are finite, in range, nonnegative where required, and within the documented legacy scale tolerance.

## Currency invariants

User wallet, product, voucher, order, payment, refund, order-item snapshot, and wallet-ledger rows store `currency CHAR(3) DEFAULT 'VND'`. Currency is uppercase and validated against the current VND-only allowlist. Product/voucher currency must match the order; wallet must match order/payment; refund must match payment; ledger must match wallet. No exchange-rate logic exists.

## Order, payment, refund, and wallet invariants

The server computes `lineTotal = unitPrice × quantity`, `subtotal = sum(lineTotal)`, and `total = subtotal - discount + shippingFee + taxAmount`. Order items retain independent unit-price, line-total, and currency snapshots.

Wallet debit/credit transactions lock the user row, compare and calculate with Decimal, update the wallet, and create a signed ledger entry atomically. Every ledger row stores `balanceBefore`, signed `amount`, and `balanceAfter`; the database checks `balanceAfter = balanceBefore + amount` and nonnegative balances. Refund transactions lock payment and wallet rows, enforce `refundedAmount + amount <= payment.amount`, and rely on durable idempotency/unique ledger keys to prevent double credit.

## API and outbox compatibility

Product/voucher/admin-wallet/refund money requests should send decimal strings. A safe-integer number is temporarily accepted by the central parser for legacy request compatibility; arbitrary decimal numbers are rejected. Responses pass through `serializeMoneyFields` and emit four-place strings.

New refund outbox payloads include `amount` as a string and `currency`. The consumer accepts legacy events that omit these fields. A legacy numeric amount is accepted only when it can be converted through the same precision/scale validation; it is logged as deprecated and cross-checked against the authoritative refund row before side effects.

## Adding a monetary field

1. Use Prisma `Decimal @db.Decimal(19, 4)` and add an explicit currency at the aggregate boundary.
2. Add a preflight/backfill migration and appropriate `CHECK` constraint; never rely on implicit MySQL truncation.
3. Parse request input with `parseMoneyInput`, calculate with `Money`, and persist with `Money.round` at a documented boundary.
4. Add the field to the centralized serializer and API/outbox schema.
5. Add utility, MySQL integration, migration-upgrade, reconciliation, and static-verification coverage.

## Migration and production runbook

1. Back up the database and record row counts/checksums for wallet, order, payment, refund, and ledger tables.
2. Run the SQL preflight in `20260724160000_decimal_money`. Any anomaly makes the migration fail before the first `ALTER`; investigate rather than editing financial rows automatically.
3. In a staging clone, run `npx prisma migrate deploy`, `npm run money:audit`, and the full integration suite.
4. Confirm `information_schema.COLUMNS` has no monetary `FLOAT`, `DOUBLE`, or `REAL`; Decimal columns have the documented precision/scale; all `ck_*` checks exist; and `prisma migrate diff` reports no drift.
5. Apply during a controlled window. The direct alters rebuild affected tables and can lock on large datasets; use an online-schema-change/staged shadow-column process if production table size exceeds the acceptable lock window.
6. Run `npm run money:audit` immediately after deployment and monitor payment/refund/outbox reconciliation. The audit is dry-run and never repairs financial data.

## Reconciliation

`npm run money:audit` reports schema float fields, database float columns, order equation mismatches, payment/refund mismatches, ledger equation mismatches, wallet/latest-ledger mismatches, legacy numeric pending outbox payloads, Decimal column definitions, and installed checks. `npm run outbox:reconcile` continues to audit durable refund/outbox state. Repair remains an explicit, audited operator action.

## Prohibited behavior

Do not use JavaScript `+`, `-`, `*`, or `/` on money; `parseFloat`; `Number(decimal)`; `Decimal.toNumber()` for business logic; `Number.EPSILON`; locale-formatted input; scientific notation; client totals as source of truth; implicit rounding; cross-currency arithmetic; or unaudited repair of financial data. `toFixed(4)` is allowed only inside the serializer after Decimal rounding, never to decide a business value.
