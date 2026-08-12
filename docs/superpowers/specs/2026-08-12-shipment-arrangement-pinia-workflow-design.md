# Shipment Arrangement Pinia Workflow Design

**Date:** 2026-08-12
**Status:** Approved
**Scope:** `wemotoo-portal` only
**References:** [`CONTEXT.md`](../../../CONTEXT.md), [`ADR-0001`](../../adr/0001-keep-portal-workflows-in-pinia.md), [`Portal Architecture Improvement Roadmap`](./2026-08-11-portal-architecture-improvement-roadmap-design.md)

## Purpose

Deepen the existing Shipment Arrangement Pinia module so the workflow has one understandable interface and one state writer. Preserve merchant-facing behaviour and backend contracts while moving filter coordination, request freshness, workbook validation, preview/apply state, and pagination recovery out of Vue.

## Scope

This phase changes only the portal Shipment Arrangement workflow:

- pending-shipment filters and pagination;
- active shipping-method filter options;
- pending-list refresh and export;
- workbook validation and preview;
- eligible-row apply and partial results;
- request freshness, debounce, operation state, and cleanup;
- the page and preview modal seams;
- focused Pinia and Nuxt tests.

This phase does not change:

- backend endpoints, request payloads, or response types;
- accepted workbook formats beyond the existing `.xlsx` and `.numbers` extensions;
- the 300 millisecond filter debounce;
- spreadsheet parsing or concurrency rules;
- page layout, translations, notification copy, or navigation;
- Shipping Method listing filters or state;
- unrelated Order or Fulfillment modules.

If implementation reveals a separate behaviour defect, it requires a failing regression test and a distinct fix. The refactor must not silently broaden product behaviour.

## Current Problem

`useShipmentArrangementStore` already owns query construction, pending rows, preview/apply requests, page clamping, and download mechanics. The page owns the other half of the same workflow:

- direct writes to filters, page, and page size;
- the 300 millisecond filter debounce;
- request-generation and watcher-suppression flags;
- list, export, import, and apply loading/error state;
- workbook extension validation;
- parallel initial loading of rows and shipping-method options;
- notification decisions based on raw results.

The preview modal also reads Pinia directly. A Nuxt test must know that the page suppresses its page watcher while apply clamps pagination. That test exposes the current shallow seam: Vue and Pinia both need to understand refresh ordering.

## Approaches Considered

### 1. Deepen the existing Pinia module in place — selected

Keep `useShipmentArrangementStore` and its store id. Replace direct state mutation and watcher-driven coordination with semantic actions and read-only public state. Keep the existing repository modules internal.

This gives the highest locality without introducing a parallel state model or changing caller identity.

### 2. Add a second workflow store around the current store — rejected

A wrapper would leave two stores able to describe the same workflow and would require delegation or synchronization. Deleting the wrapper would expose the old shallow interface again, so it would not earn depth.

### 3. Keep Vue coordination and extract more helpers — rejected

Pure helpers could reduce repeated syntax, but they would not own request ordering, debounce cancellation, operation state, or apply-owned pagination recovery. Callers would continue assembling the workflow.

## Ownership

### Pinia owns

- filter values and their transitions;
- current page and page size;
- the 300 millisecond filter debounce;
- cancellation of pending debounce work;
- list-request generation and latest-intent acceptance;
- pending rows, total count, and retained working context;
- active shipping-method option loading and errors;
- list, export, import-preview, and apply loading/error state;
- `.xlsx` and `.numbers` extension validation;
- preview, eligible-row mapping, apply result, and partial failures;
- post-apply list refresh and last-page clamping;
- workbook session dismissal;
- download filename, object URL creation, click, and revocation;
- unmount cleanup and stale-response invalidation.

### Vue owns

- rendering and responsive layout;
- file-input and modal visibility;
- translations and notification presentation;
- table-column visibility;
- mapping semantic outcomes to localized notifications;
- emitting merchant intent to Pinia actions.

The page and modal never write workflow state directly. The modal receives preview state and apply state as props and emits apply or dismiss intent.

## Public State

The store exposes read-only semantic state. Internal refs are not returned directly when callers do not need to write them.

```ts
type ShipmentArrangementFilters = {
	search: string;
	shippingMethodId: number | undefined;
	dateRange: Range;
};

type ShipmentArrangementFailure =
	| { kind: 'unsupported_workbook' }
	| { kind: 'missing_preview' }
	| { kind: 'no_eligible_rows' }
	| { kind: 'request_failed'; message: string };
```

The rendering surface includes:

- `filters`, `page`, and `pageSize` snapshots;
- `rows`, `total`, `firstVisibleRow`, and `lastVisibleRow`;
- active shipping-method options;
- `preview`, `eligibleCount`, and `applyResult`;
- explicit `loading`, `exporting`, `importing`, and `applying` flags;
- separate list, option, export, import, and apply failures.

Separate operation state prevents one action from hiding another action's progress or error.

## Public Actions

The target interface expresses merchant intent rather than implementation coordination:

```ts
initialize(): Promise<void>;
refreshPending(): Promise<ShipmentArrangementRefreshOutcome>;
setSearch(value: string): void;
setShippingMethod(id: number | undefined): void;
setDateRange(range: Range): void;
clearFilters(): Promise<void>;
setPage(page: number): Promise<void>;
setPageSize(size: number): Promise<void>;
exportPending(): Promise<ShipmentArrangementExportOutcome>;
previewWorkbook(file: File): Promise<ShipmentArrangementPreviewOutcome>;
applyPreview(): Promise<ShipmentArrangementApplyOutcome>;
dismissImport(): void;
dispose(): void;
```

`$reset()` remains available for test isolation. It follows the same cleanup path as `dispose()` before restoring initial state.

Action outcomes are semantic discriminated unions:

- `completed` includes the successful preview or apply result when relevant;
- `stale` means a newer list intent superseded the response;
- `rejected` contains a local semantic failure;
- `failed` contains a `request_failed` failure with the backend message.

Actions store the same result or failure needed for rendering. Vue uses the returned outcome for immediate notification decisions without mutating Pinia.

## Filter and Pagination Flow

Every filter setter updates private state, invalidates any in-flight list response, cancels the prior debounce, and schedules one refresh after 300 milliseconds. The settled filter refresh resets the page to 1 and issues exactly one request.

`clearFilters()` cancels the debounce, restores empty filters, resets the page to 1, and refreshes exactly once.

`setPage(page)` refreshes immediately. `setPageSize(size)` resets to page 1 and refreshes exactly once. Vue watchers are not used to trigger requests.

Each list intent receives a private generation. Only the response matching the latest generation may replace rows, total, list failure, or list loading state. Generation counters and timer handles remain private implementation.

## Initialization and Re-entry

`initialize()` coordinates two independent reads:

1. refresh pending shipments using retained filters and pagination;
2. fetch active shipping-method options through the existing Shipping Method Pinia action.

Both reads settle independently. If options fail, the pending list remains usable with the default “All shipping methods” option and exposes an option failure. Loading options must not mutate or depend on Shipping Method listing filters.

The store retains filters and loaded rows across ordinary page navigation. Re-entering the page always calls `initialize()` to revalidate retained state against the backend.

On unmount, `dispose()` cancels pending debounce work and invalidates unfinished list responses. It does not clear retained filters or rows.

## Workbook Session

`previewWorkbook(file)` clears the previous workbook session, validates the filename case-insensitively, and accepts only `.xlsx` or `.numbers`.

An unsupported extension returns `rejected` with `unsupported_workbook`; Vue translates and notifies it. A repository failure returns `failed` with the backend message. A completed preview is returned and stored, after which Vue opens the modal.

The modal receives preview, eligible count, apply result, applying state, and apply failure through props. It emits apply and dismiss intent and does not call Pinia itself.

`dismissImport()` clears preview, apply result, import failure, and apply failure. Modal visibility remains local Vue state.

## Apply Flow

`applyPreview()` enforces its own preconditions even though the modal disables invalid input:

- no preview returns `rejected` with `missing_preview`;
- no valid or warning rows returns `rejected` with `no_eligible_rows`;
- rows marked `error` are never included;
- valid and warning rows retain `source_updated_at` in the apply payload.

A repository response with failed rows is a completed transport outcome, not an exception. The result and per-row failures remain visible in the open modal.

After every completed apply, Pinia refreshes the current pending page. If the page is now beyond the last page, Pinia clamps it and performs one final refresh for the clamped page. No Vue watcher participates, so clamping cannot create a duplicate request.

## Export Flow

Export uses the current filters without pagination. Pinia owns query construction, the existing dated filename, object URL creation, download activation, and guaranteed URL revocation. Vue presents success or failure notifications from the semantic outcome.

## Internal Seams

The existing fulfillment repository method shape remains the internal transport seam. Production resolves it lazily from `useNuxtApp().$api.fulfillment`. Focused workflow tests provide an in-memory object with the same methods; no generic transport abstraction is introduced.

Active shipping methods continue to come from `useShippingMethodStore().fetchActiveShippingMethodOptions()`. That action gains an optional notification policy whose default preserves existing caller behaviour; Shipment Arrangement suppresses the nested notification, stores the option failure, and lets its Vue caller present it. Shipment Arrangement does not copy or mutate Shipping Method listing filters.

Merchant id continues to come from the existing `X_MERCHANT_ID` cookie when constructing the apply request. Backend contracts remain unchanged.

## Error Handling

Pinia converts unknown repository failures to `error instanceof Error ? error.message : String(error)` and stores a `request_failed` failure for the relevant operation. It does not translate messages or invoke notifications.

Local precondition failures use semantic kinds with no embedded English copy. Vue translates those kinds. Partial apply failures remain part of `applyResult`, distinct from `applyFailure`.

## Test Strategy

### Pinia workflow tests

Drive only the public store interface with fake time and an in-memory fulfillment adapter. Cover:

- initialization success and independent option failure;
- 300 millisecond filter debounce and cancellation;
- clear-filter, page, and page-size single-refresh rules;
- stale list response rejection;
- retained filters plus re-entry revalidation;
- unmount cancellation and stale-response invalidation;
- `.xlsx` and `.numbers` acceptance and unsupported-file rejection;
- preview success and repository failure;
- apply preconditions and eligible-row mapping;
- completed, partial, and failed apply outcomes;
- final-page clamp without duplicate refresh;
- filtered export and object URL cleanup;
- workbook-session dismissal and `$reset()` cleanup.

Tests assert semantic state and outcomes, not timer handles, generation values, watcher flags, or raw Nuxt wiring.

### Nuxt presentation tests

Cover only:

- initial action wiring and rendered operation states;
- filter controls issuing semantic intent;
- file-picker acceptance and preview-modal opening;
- translated unsupported-workbook and repository-failure notifications;
- completed and partial apply notifications;
- modal props and emitted apply/dismiss intent;
- rendering of loading, empty, error, preview, and partial-result states.

Delete page tests for debounce timing, watcher suppression, direct state mutation, and apply-owned clamping after those invariants move to Pinia tests.

## Migration Sequence

1. Add failing Pinia tests for the target semantic interface and request-freshness rules.
2. Deepen `useShipmentArrangementStore` in place, keeping its id and repository contracts.
3. Migrate the page from direct writes and watchers to semantic actions and read-only state.
4. Convert the preview modal to props and emitted intent.
5. Move workflow assertions from Nuxt tests to Pinia tests and delete replaced coordination paths.
6. Run focused Pinia, Nuxt, lint, and type verification; compare any repository-wide baseline failures without claiming they were introduced by this phase.

No compatibility aliases, parallel store, feature flag, or permanent delegation layer survives the migration.

## Completion Criteria

- The page contains no filter/page watcher that triggers Shipment Arrangement requests.
- The page and modal do not write Shipment Arrangement state directly.
- Pinia owns all workflow loading and failure state.
- Only the newest list intent can update rows and total.
- Filter settling, clearing, page change, and page-size change make the specified number of requests.
- Apply owns refresh and page clamping without duplicate requests.
- Preview and apply preconditions are enforced by Pinia.
- Partial apply results remain visible and actionable.
- Unmount cleanup cancels pending work without clearing retained context.
- Focused tests exercise the public Pinia seam and pass.
- Relevant lint and type checks introduce no new Shipment Arrangement diagnostics.

## Stop Conditions

Return to design instead of expanding scope if implementation would require:

- a backend contract change;
- a second workflow store or public compatibility facade;
- public generation counters, debounce handles, or watcher-suppression flags;
- changing accepted workbook formats or apply eligibility;
- coupling active options to Shipping Method listing filters;
- changing merchant-facing layout or workflow behaviour.
