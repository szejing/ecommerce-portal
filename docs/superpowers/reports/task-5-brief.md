# Task 5: Portal configuration, payment QR and closure controls

**Work from:** `/Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal/.worktrees/appointment-deposits`
**Branch:** `codex/appointment-deposits` (already checked out; baseline `3b53f16a`)
**Backend contract (read-only):** `/Users/szejinggo/Documents/Projects/ecommerce/ecommerce-backend/.worktrees/appointment-deposits`
**Plan:** backend worktree `docs/superpowers/plans/2026-11-13-appointment-deposits.md` Task 5
**Spec:** backend worktree `docs/superpowers/specs/2026-11-13-appointment-deposits.md`

## Do not edit the plan file. Commit when the task is green.

## Required files (from plan)

- `app/components/Z/Input/Product/Service.vue` — nullable `appointment_deposit_amt` (inherit / none / custom per-unit)
- Product creation/update/state/schema/types
- `app/components/Z/Section/Order/Detail/Payment.vue`
- new `app/components/Z/Modal/Order/PaymentQr.vue`
- order/appointment repositories, signed Nitro server routes
- locale files (en/ms)
- appointment detail actions / no-show disposition UI
- tests (Vitest unit/nuxt and/or repository tests per portal skills)

## Acceptance (red→green scenarios)

1. Product create/edit: inherit (null), zero (no deposit), custom per-unit round-trip. Setting template for appointment default deposit renders without special-case widget logic.
2. After RM50 deposit paid: payment card shows full price, deposit required, collected, RM150 outstanding/released; **both** Add payment and Generate QR. Reopening QR modal reuses valid unpaid request (`createOrReuse` via existing `POST .../generate-payment` with balance collection). Show paid status after receipt.
3. No-show modal: explicit retain / refund / reschedule. Retain/refund call appointment PATCH with `status: no_show` and `deposit_disposition: retain|refund`. Reschedule means **do not close** (keep booking open). Show released balance / refund-pending / payment_review_required from order DTO accurately.

## Backend API notes

- Order DTO exposes: `deposit_required_amt`, `collected_amt`, `outstanding_amt`, `released_balance_amt`, `closure_reason`, `closed_at`, `refund_status`, `payment_review_required`
- Item: `deposit_unit_amt`, `deposit_required_amt`
- Payment: `payment_purpose`, `payment_request_id`
- Product: `appointment_deposit_amt` nullable
- Staff balance QR: reuse merchant `generate-payment` path; `PaymentRequestService.createOrReuse(..., collectBalance=true)` for balance. Response includes checkout/`payment_url`, amount, currency, status.
- Appointment PATCH body: `deposit_disposition?: 'retain' | 'refund'` required when setting `NO_SHOW`
- QR must be rendered locally (never third-party QR image hosting of payment URLs)
- Preserve pre-existing Portal `bun.lock` change if present; commit only this task’s edits
- Do not push/merge/deploy; do not run production migrations

## Skills to follow

- Portal: `.cursor/skills/implementation-and-tests`, `nuxt-ui-usage`, `i18n-translation`, `repository-module-creation` as needed
- Prefer existing Nuxt UI / Z* patterns; MVP-first

## Verify

- Focused Vitest / repository tests for new behavior
- `bun run typecheck` (and lint if feasible)
- Commit on `codex/appointment-deposits`

## Report file

Write full report to: `docs/superpowers/reports/task-5-report.md`
