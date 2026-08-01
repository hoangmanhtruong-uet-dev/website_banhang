# Order state machine

`Order.status` remains the compatibility projection in this phase. It is a typed, centrally-written state value; API routes, workers, payment/refund services, and inventory code must call `transitionOrderInTransaction` or `OrderStateService.transition`.

## Canonical states

- Payment gate: `pending`, `payment_failed`, `paid`, `payment_review`.
- Fulfillment: `confirmed`, `packing`, `shipping`, `delivered`.
- Cancellation/expiry: `cancelled`, `expired`.
- Return: `return_requested`, `return_approved`, `return_rejected`, `returning`, `returned`.
- Refund: `refund_pending`, `refunded`.

Absolute terminal states are `refunded` and `return_rejected`. `cancelled` and `expired` can only leave through trusted late-payment review. `delivered` becomes effectively terminal after the configured return window. `returned` can only proceed to compensation.

## Main graph

```text
pending -> paid -> confirmed -> packing -> shipping -> delivered
pending -> payment_failed | expired | cancelled | payment_review
paid|confirmed|packing|delivered|returned|payment_review -> refund_pending -> refunded
delivered -> return_requested -> return_approved -> returning -> returned
return_requested -> return_rejected
expired|cancelled -> payment_review (trusted payment webhook/system only)
```

The executable graph and actor edge matrix live in `src/lib/services/order-state.service.ts`. A row lock plus guarded `status + statusVersion` update protects every transition. History, `DomainAuditLog`, timestamps, return record, and outbox event are committed in the same MySQL transaction.

## Actor rules

- Customer: cancel an owned pending order; request return for an owned delivered order.
- Admin: fulfillment and return decisions, but never payment success and never graph bypass.
- Seller: confirm/pack only when every order item belongs to that seller.
- Shipper: ship/deliver only an assigned shipment; initial self-assignment is atomic with `packing -> shipping`.
- Payment webhook: payment success/failure and late-payment review only.
- System workers: expiry and financial compensation edges explicitly listed in the matrix.

Every retryable command requires an idempotency key. Reusing the key with a different actor/target/reason/metadata is a conflict. Self-transition is only a replay when the original key and payload match.

## Lifecycle separation plan

The legacy schema mixed payment, fulfillment, return, and refund concepts in `Order.status`. This migration canonicalizes legacy names and adds a durable return record, while retaining `Order.status` for current UI/API compatibility. A later compatibility-breaking phase should:

1. Add typed `fulfillmentStatus`, `returnStatus`, and `refundStatus`; retain the existing payment record/status as payment source of truth.
2. Backfill each axis from transition history plus Payment/Refund/OrderReturn data, with an anomaly preflight.
3. Dual-read and derive the compatibility `Order.status` projection centrally.
4. Move clients to the orthogonal fields, then make the compatibility field read-only or remove it.

Do not dual-write these axes ad hoc. The next migration must use the same transition transaction as its only writer.

## Operations

- `npm run order-state:audit`: fail on direct production/test `Order.status` updates outside the state service.
- `npm run order-state:reconcile`: dry-run anomaly report. Automatic financial repair is intentionally disabled.
- `npm run test:integration`: MySQL 8 migrations, legacy upgrade/preflight, integration, idempotency, outbox, money, and race tests.