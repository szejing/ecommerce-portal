# Task 5 report — Portal appointment deposits

**Status:** DONE_WITH_CONCERNS  
**Branch:** `codex/appointment-deposits`  
**Worktree:** `ecommerce-portal/.worktrees/appointment-deposits`

## Delivered

- Service product deposit policy UI (`inherit` / `none` / `custom`) wired through AdditionalInfo → Creation/Update → Product store/transform.
- Order payment card shows deposit summary (full price, required, collected, outstanding/released, refund/review) and keeps **Add payment** + **Generate QR** while outstanding.
- `PaymentQr` modal creates/reuses `POST .../generate-payment`, renders QR locally via `qrcode`, copy/open link.
- Appointment edit requires retain/refund for no-show; reschedule keeps booking open.
- Nitro proxy + repository `generatePayment`; en/ms/zh-CN copy.
- Unit tests for deposit summary + outstanding default payment amount; repository generatePayment assertion.

## Verification

- `bun run test:vitest:run -- test/unit/order-deposit-summary.spec.ts test/unit/order-payment-amt.spec.ts` — pass (Node 22)
- `bun test` OrderModule `generatePayment` — pass
- Full `typecheck` still reports many pre-existing baseline errors; Task 5 files had a temporary `qrcode` typing shim. Nuxt `.nuxt` types may need regenerate for a clean project-wide check.

## Concerns

- Nuxt component mount test `test/nuxt/order-detail-payment-deposit.nuxt.spec.ts` not run in this pass (font/network heavy); unit coverage covers the summary rules used by the card.
- Setting-template default deposit relies on existing Configuration rendering (no special-case widget).
