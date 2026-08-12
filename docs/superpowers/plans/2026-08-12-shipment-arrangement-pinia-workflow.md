# Shipment Arrangement Pinia Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the existing Shipment Arrangement Pinia module so it exclusively owns filters, request freshness, operation state, workbook validation, preview/apply state, refresh/clamping, and cleanup while preserving merchant-facing behaviour.

**Architecture:** Keep `useShipmentArrangementStore` and its existing id as the workflow seam. Move state transitions and ordering behind semantic Pinia actions, keep the existing fulfillment repository and Shipping Method Pinia action internal, and make the page and modal presentation-only adapters. Migrate in vertical slices and remove every temporary shallow path before completion.

**Tech Stack:** Nuxt 4, Vue 3, Pinia 3, TypeScript, Vitest, Bun, `@nuxt/test-utils`.

## Global Constraints

- Scope is `wemotoo-portal` only; backend endpoints, payloads, response types, routes, translations, and merchant-facing layout do not change.
- Preserve `.xlsx` and `.numbers` acceptance, the 300 millisecond filter debounce, valid/warning apply eligibility, error-row exclusion, `source_updated_at`, partial results, and the dated download filename.
- Pinia is the sole workflow-state writer. Vue owns modal visibility, translations, notifications, file-input rendering, and table-column visibility.
- Keep the fulfillment repository shape as the internal transport seam. Do not add a generic transport abstraction, second store, feature flag, or permanent compatibility alias.
- Active options continue through `fetchActiveShippingMethodOptions`; its new notification option defaults to current behaviour.
- Keep request generations and debounce handles private. Tests assert outcomes, not coordination fields.
- Use `PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH` for Nuxt, Vitest, typecheck, and ESLint. Do not run Nuxt with `bun --bun`.
- Baseline: the Bun store suite passes 6 tests. The focused Nuxt page/modal run has 8 passes and 5 failures from stale selectors and page-watcher assertions; delete or replace those assertions when ownership moves.
- Root ESLint is blocked by the tracked `eslint.config.mjs` import missing `./`; use Task 6's temporary verification procedure and do not commit that config change.
- Full typecheck has unrelated existing failures; introduce no new Shipment Arrangement diagnostics.

## Target Interface

Export these types from `app/stores/ShipmentArrangement/ShipmentArrangement.ts`:

```ts
export type ShipmentArrangementFilters = {
	search: string;
	shippingMethodId: number | undefined;
	dateRange: Range;
};

export type ShipmentArrangementFailure =
	| { kind: 'unsupported_workbook' }
	| { kind: 'missing_preview' }
	| { kind: 'no_eligible_rows' }
	| { kind: 'request_failed'; message: string };

type RequestFailure = Extract<ShipmentArrangementFailure, { kind: 'request_failed' }>;
type ApplyRejection = Extract<ShipmentArrangementFailure, { kind: 'missing_preview' | 'no_eligible_rows' }>;

export type ShipmentArrangementRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: RequestFailure };
export type ShipmentArrangementExportOutcome =
	| { status: 'completed' }
	| { status: 'failed'; failure: RequestFailure };
export type ShipmentArrangementPreviewOutcome =
	| { status: 'completed'; preview: ShipmentArrangementPreviewResponse }
	| { status: 'rejected'; failure: { kind: 'unsupported_workbook' } }
	| { status: 'failed'; failure: RequestFailure };
export type ShipmentArrangementApplyOutcome =
	| { status: 'completed'; result: ShipmentArrangementApplyResponse }
	| { status: 'rejected'; failure: ApplyRejection }
	| { status: 'failed'; failure: RequestFailure };
```

The final actions are:

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
$reset(): void;
```

Rendering state is read-only: filters, paging, rows, totals, visible-row bounds, options, preview, eligibility, apply result, operation flags, and per-operation failures.

---

### Task 1: Own list intent, debounce, pagination, and request freshness

**Files:**

- Modify: `app/stores/ShipmentArrangement/ShipmentArrangement.ts`
- Modify: `test/unit/shipment-arrangement-store.spec.ts`

**Interfaces:**

- Consumes: Existing fulfillment list method and `ShipmentArrangementQuery`.
- Produces: `SHIPMENT_ARRANGEMENT_FILTER_DEBOUNCE_MS`, `refreshPending`, filter setters, pagination setters, `clearFilters`, `dispose`, and refresh outcomes.

- [ ] **Step 1: Convert the store suite to Vitest and retain its six cases**

Replace `bun:test` with:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

Replace `mock()` with `vi.fn()`, add `afterEach(() => vi.useRealTimers())`, and add:

```ts
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}
```

- [ ] **Step 2: Write failing debounce and single-refresh tests**

```ts
it('debounces filter intent for 300 ms and refreshes page one once', async () => {
	vi.useFakeTimers();
	const store = useShipmentArrangementStore();
	await store.setPage(3);
	getShipmentArrangement.mockClear();
	store.setSearch(' WM-100 ');
	store.setShippingMethod(7);
	await vi.advanceTimersByTimeAsync(299);
	expect(getShipmentArrangement).not.toHaveBeenCalled();
	await vi.advanceTimersByTimeAsync(1);
	await vi.runAllTicks();
	expect(store.page).toBe(1);
	expect(getShipmentArrangement).toHaveBeenCalledTimes(1);
});

it('clearFilters cancels debounce and refreshes exactly once', async () => {
	vi.useFakeTimers();
	const store = useShipmentArrangementStore();
	store.setSearch('WM-100');
	await store.clearFilters();
	await vi.advanceTimersByTimeAsync(300);
	expect(store.filters.search).toBe('');
	expect(store.page).toBe(1);
	expect(getShipmentArrangement).toHaveBeenCalledTimes(1);
});
```

Add a page-size case asserting page 1, the chosen size, and one immediate request.

- [ ] **Step 3: Write failing newest-intent and disposal tests**

```ts
it('allows only the newest list request to replace rows', async () => {
	const first = deferred<ShipmentArrangementListResponse>();
	const second = deferred<ShipmentArrangementListResponse>();
	getShipmentArrangement.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
	const store = useShipmentArrangementStore();
	const oldRequest = store.refreshPending();
	const newRequest = store.setPage(2);
	second.resolve({ data: [previewResponse.rows[1]!], total: 2 });
	await newRequest;
	first.resolve({ data: [previewResponse.rows[0]!], total: 1 });
	expect(await oldRequest).toEqual({ status: 'stale' });
	expect(store.rows.map(row => row.order_no)).toEqual(['WM-101']);
});

it('dispose invalidates pending work without clearing context', async () => {
	vi.useFakeTimers();
	const pending = deferred<ShipmentArrangementListResponse>();
	getShipmentArrangement.mockReturnValueOnce(pending.promise);
	const store = useShipmentArrangementStore();
	store.setSearch('WM-100');
	await vi.advanceTimersByTimeAsync(300);
	store.dispose();
	pending.resolve({ data: [previewResponse.rows[0]!], total: 1 });
	await vi.runAllTicks();
	expect(store.filters.search).toBe('WM-100');
	expect(store.rows).toEqual([]);
	expect(store.loading).toBe(false);
});
```

Add:

```ts
it('$reset cancels work and restores initial workflow state', async () => {
	vi.useFakeTimers();
	const store = useShipmentArrangementStore();
	store.setSearch('WM-100');
	store.$reset();
	await vi.advanceTimersByTimeAsync(300);
	expect(getShipmentArrangement).not.toHaveBeenCalled();
	expect(store.filters).toEqual({ search: '', shippingMethodId: undefined, dateRange: { start: undefined, end: undefined } });
	expect({ page: store.page, pageSize: store.pageSize, rows: store.rows, total: store.total }).toEqual({
		page: 1, pageSize: 15, rows: [], total: 0,
	});
	expect(store.preview).toBeUndefined();
	expect(store.applyResult).toBeUndefined();
});
```

- [ ] **Step 4: Run red**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/shipment-arrangement-store.spec.ts
```

Expected: FAIL because semantic setters, refresh outcomes, debounce ownership, request freshness, and `dispose` do not exist.

- [ ] **Step 5: Implement the private list state**

Use `searchState`, `shippingMethodIdState`, `dateRangeState`, `pageState`, `pageSizeState`, `rowsState`, and `totalState`. Add:

```ts
export const SHIPMENT_ARRANGEMENT_FILTER_DEBOUNCE_MS = 300;
let listGeneration = 0;
let filterTimer: ReturnType<typeof setTimeout> | null = null;

async function requestPending(generation: number): Promise<ShipmentArrangementRefreshOutcome> {
	loadingState.value = true;
	listFailureState.value = undefined;
	try {
		const response = await useNuxtApp().$api.fulfillment.getShipmentArrangement(toQuery(true));
		if (generation !== listGeneration) return { status: 'stale' };
		rowsState.value = response.data;
		totalState.value = response.total;
		return { status: 'completed' };
	} catch (error) {
		if (generation !== listGeneration) return { status: 'stale' };
		const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
		listFailureState.value = failure;
		return { status: 'failed', failure };
	} finally {
		if (generation === listGeneration) loadingState.value = false;
	}
}
```

Every filter setter cancels the prior timer, increments `listGeneration`, and schedules one `requestPending` after 300 ms with page reset to 1. Immediate actions cancel the timer and issue one new generation. `dispose` cancels, increments, and clears loading without clearing rows/filters.

- [ ] **Step 6: Run green and commit**

Run the Task 1 test command; expect PASS. Then:

```bash
git add app/stores/ShipmentArrangement/ShipmentArrangement.ts test/unit/shipment-arrangement-store.spec.ts
git commit -m "refactor(shipment-arrangement): own list intent in Pinia"
```

### Task 2: Coordinate active options without nested notifications

**Files:**

- Modify: `app/stores/ShippingMethod/ShippingMethod.ts`
- Modify: `app/stores/ShipmentArrangement/ShipmentArrangement.ts`
- Modify: `test/unit/fulfillment-shipping-stores.spec.ts`
- Modify: `test/unit/shipment-arrangement-store.spec.ts`

**Interfaces:**

- Consumes: Task 1 list workflow and `fetchActiveShippingMethodOptions`.
- Produces: `initialize`, active options state, options loading/failure, and `fetchActiveShippingMethodOptions(options?: { notifyOnError?: boolean })`.

- [ ] **Step 1: Write and run the failing notification-policy test**

```ts
it('can return an active-option failure without nested notification', async () => {
	apiMock.shippingMethod.getMany.mockRejectedValue(new Error('Options unavailable'));
	const store = useShippingMethodStore();
	await expect(store.fetchActiveShippingMethodOptions({ notifyOnError: false })).rejects.toThrow('Options unavailable');
	expect(failedNotification).not.toHaveBeenCalled();
});
```

Run:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/fulfillment-shipping-stores.spec.ts
```

Expected: FAIL because the action always notifies.

- [ ] **Step 2: Implement the default-preserving option and run green**

Change the action signature to:

```ts
async fetchActiveShippingMethodOptions(options: { notifyOnError?: boolean } = {}): Promise<ShippingMethodOption[]>
```

In its catch branch call `failedNotification` only when `options.notifyOnError !== false`, then rethrow. Run the Step 1 command; expect PASS.

- [ ] **Step 3: Write failing independent initialization tests**

```ts
it('keeps list success when active options fail', async () => {
	getShipmentArrangement.mockResolvedValue({ data: [previewResponse.rows[0]!], total: 1 });
	vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockRejectedValue(new Error('Options unavailable'));
	const store = useShipmentArrangementStore();
	await store.initialize();
	expect(store.rows).toHaveLength(1);
	expect(store.activeShippingMethods).toEqual([]);
	expect(store.optionsFailure).toEqual({ kind: 'request_failed', message: 'Options unavailable' });
});
```

Add the success counterpart:

```ts
it('initializes rows and active options through one action', async () => {
	getShipmentArrangement.mockResolvedValue({ data: [previewResponse.rows[0]!], total: 1 });
	const fetchOptions = vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockResolvedValue([
		{ id: 2, description: 'Express', priority: 2, is_active: true },
	]);
	const store = useShipmentArrangementStore();
	await store.initialize();
	expect(store.rows).toHaveLength(1);
	expect(store.activeShippingMethods.map(method => method.id)).toEqual([2]);
	expect(fetchOptions).toHaveBeenCalledWith({ notifyOnError: false });
});
```

Add a re-entry case: call `setSearch('WM-100')`, settle its timer, clear the list mock, call `initialize()` again, and assert the new list request contains `$search: 'WM-100'` rather than resetting the filter.

Run the store test; expect FAIL because initialization and option state do not exist.

- [ ] **Step 4: Implement independent initialization**

```ts
async function loadActiveShippingMethods(): Promise<void> {
	optionsLoadingState.value = true;
	optionsFailureState.value = undefined;
	try {
		activeShippingMethodsState.value = await useShippingMethodStore().fetchActiveShippingMethodOptions({ notifyOnError: false });
	} catch (error) {
		optionsFailureState.value = { kind: 'request_failed', message: error instanceof Error ? error.message : String(error) };
	} finally {
		optionsLoadingState.value = false;
	}
}

async function initialize(): Promise<void> {
	await Promise.all([refreshPending(), loadActiveShippingMethods()]);
}
```

- [ ] **Step 5: Run both unit files and commit**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/fulfillment-shipping-stores.spec.ts test/unit/shipment-arrangement-store.spec.ts
git add app/stores/ShippingMethod/ShippingMethod.ts app/stores/ShipmentArrangement/ShipmentArrangement.ts test/unit/fulfillment-shipping-stores.spec.ts test/unit/shipment-arrangement-store.spec.ts
git commit -m "refactor(shipment-arrangement): coordinate filter options in Pinia"
```

Expected: both files PASS before commit.

### Task 3: Own export, workbook preview, apply, and dismissal

**Files:**

- Modify: `app/stores/ShipmentArrangement/ShipmentArrangement.ts`
- Modify: `app/pages/orders/shipment-arrangement.vue`
- Modify: `test/unit/shipment-arrangement-store.spec.ts`
- Modify: `test/nuxt/shipment-arrangement-page.nuxt.spec.ts`

**Interfaces:**

- Consumes: Task 1 query construction and existing export/preview/apply repository methods.
- Produces: semantic operation outcomes, explicit operation state, `previewWorkbook`, `applyPreview`, `exportPending`, and `dismissImport`.

- [ ] **Step 1: Write failing workbook and dismissal tests**

```ts
it('rejects unsupported workbooks before transport and accepts uppercase XLSX', async () => {
	const store = useShipmentArrangementStore();
	expect(await store.previewWorkbook(new File(['csv'], 'shipments.csv'))).toEqual({
		status: 'rejected', failure: { kind: 'unsupported_workbook' },
	});
	expect(previewShipmentArrangement).not.toHaveBeenCalled();
	previewShipmentArrangement.mockResolvedValue(previewResponse);
	expect(await store.previewWorkbook(new File(['xlsx'], 'SHIPMENTS.XLSX'))).toEqual({
		status: 'completed', preview: previewResponse,
	});
});

it('dismissImport clears the complete workbook session', async () => {
	previewShipmentArrangement.mockResolvedValue(previewResponse);
	applyShipmentArrangement.mockResolvedValue({ total: 2, updated: 2, failed: 0, errors: [] });
	const store = useShipmentArrangementStore();
	await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
	await store.applyPreview();
	store.dismissImport();
	expect(store.preview).toBeUndefined();
	expect(store.applyResult).toBeUndefined();
	expect(store.importFailure).toBeUndefined();
	expect(store.applyFailure).toBeUndefined();
});
```

- [ ] **Step 2: Write failing apply and export tests**

Add these precondition cases:

```ts
it('rejects apply without a preview or eligible rows', async () => {
	const store = useShipmentArrangementStore();
	expect(await store.applyPreview()).toEqual({ status: 'rejected', failure: { kind: 'missing_preview' } });
	previewShipmentArrangement.mockResolvedValue({
		...previewResponse,
		valid: 0,
		warnings: 0,
		errors: 1,
		rows: [previewResponse.rows[2]!],
	});
	await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
	expect(await store.applyPreview()).toEqual({ status: 'rejected', failure: { kind: 'no_eligible_rows' } });
});
```

Add a partial-result case that sets page size 2 and page 3 through actions, clears prior list calls, applies `previewResponse`, and asserts:

```ts
const partialApplyResponse = { total: 2, updated: 1, failed: 1, errors: [applyError] };
applyShipmentArrangement.mockResolvedValue(partialApplyResponse);
const store = useShipmentArrangementStore();
await store.setPageSize(2);
await store.setPage(3);
getShipmentArrangement.mockClear();
getShipmentArrangement
	.mockResolvedValueOnce({ data: [], total: 4 })
	.mockResolvedValueOnce({ data: previewResponse.rows.slice(0, 2), total: 4 });
await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
const outcome = await store.applyPreview();
expect(outcome).toEqual({ status: 'completed', result: partialApplyResponse });
expect(store.page).toBe(2);
expect(getShipmentArrangement).toHaveBeenCalledTimes(2);
expect(applyShipmentArrangement.mock.calls[0]?.[0].rows).toEqual(
	previewResponse.rows.filter(row => row.status !== 'error').map(row => ({
		fulfillment_id: row.fulfillment_id,
		source_updated_at: row.source_updated_at,
		order_no: row.order_no,
		batch_no: row.batch_no,
		courier: row.courier,
		tracking_no: row.tracking_no,
	})),
);
```

Use this exact cleanup case:

```ts
it('always revokes an export object URL', async () => {
	downloadShipmentArrangement.mockResolvedValue(new Blob(['xlsx']));
	click.mockImplementationOnce(() => { throw new Error('Download blocked'); });
	const store = useShipmentArrangementStore();
	const outcome = await store.exportPending();
	expect(outcome).toEqual({
		status: 'failed',
		failure: { kind: 'request_failed', message: 'Download blocked' },
	});
	expect(revokeObjectURL).toHaveBeenCalledWith('blob:shipment-arrangement');
	expect(store.exporting).toBe(false);
});
```

- [ ] **Step 3: Run red**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/shipment-arrangement-store.spec.ts
```

Expected: FAIL because semantic validation, outcomes, preconditions, operation failures, and dismissal do not exist.

- [ ] **Step 4: Implement separate operation state and semantic outcomes**

Use distinct private refs for export, import, and apply flags/failures. Preview starts with:

```ts
async function previewWorkbook(file: File): Promise<ShipmentArrangementPreviewOutcome> {
	dismissImport();
	if (!/\.(xlsx|numbers)$/i.test(file.name)) {
		const failure = { kind: 'unsupported_workbook' as const };
		importFailureState.value = failure;
		return { status: 'rejected', failure };
	}
	importingState.value = true;
	try {
		const response = await useNuxtApp().$api.fulfillment.previewShipmentArrangement(file);
		previewState.value = response;
		return { status: 'completed', preview: response };
	} catch (error) {
		const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
		importFailureState.value = failure;
		return { status: 'failed', failure };
	} finally {
		importingState.value = false;
	}
}
```

`applyPreview` rejects missing/empty eligibility, sends only valid/warning rows, stores partial results, refreshes, clamps, and refreshes the clamped page once. A post-apply list failure remains `listFailure` and does not erase a completed apply result.

In export, declare `objectUrl` before `try`, create/click inside `try`, return a failed outcome from `catch`, and revoke only when defined in `finally`.

- [ ] **Step 5: Migrate page export/preview/apply handlers to outcomes**

Before changing the page, update its export, preview-failure, and partial-apply tests to mock the exact outcome unions and verify existing notification copy. Run only those named cases and verify they fail because the page still expects thrown failures.

Replace local export/import/apply flags with `store.exporting`, `store.importing`, and `store.applying`. Use returned outcomes to show success, partial, or failure notifications; open `previewOpen` only for a completed preview. Use `store.importFailure` and `store.applyFailure` for alert descriptions. Keep filter/page watchers until Task 4.

- [ ] **Step 6: Run green and commit**

Run the Task 3 store command and:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-page.nuxt.spec.ts -t "exports|previews|partial apply"
```

Expected: the store file and selected operation cases PASS. The four known watcher-coupled page cases remain for Task 4. Then:

```bash
git add app/stores/ShipmentArrangement/ShipmentArrangement.ts app/pages/orders/shipment-arrangement.vue test/unit/shipment-arrangement-store.spec.ts test/nuxt/shipment-arrangement-page.nuxt.spec.ts
git commit -m "refactor(shipment-arrangement): own workbook session in Pinia"
```

### Task 4: Migrate the page to semantic actions and read-only state

**Files:**

- Modify: `app/stores/ShipmentArrangement/ShipmentArrangement.ts`
- Modify: `app/pages/orders/shipment-arrangement.vue`
- Modify: `test/unit/shipment-arrangement-store.spec.ts`
- Modify: `test/nuxt/shipment-arrangement-page.nuxt.spec.ts`

**Interfaces:**

- Consumes: Tasks 1–3 store interface.
- Produces: a presentation-only page with local `fileInput` and `previewOpen`; removes workflow watchers, local operation state, direct writes, and page-side Shipping Method coordination.

- [ ] **Step 1: Replace lifecycle-coupled tests with intent tests**

Delete page tests for debounce timing, debounce cancellation, watcher suppression, and apply-owned clamping. Those cases now live in the store suite. Add:

```ts
it('initializes once and sends filter intent to Pinia', async () => {
	const store = useShipmentArrangementStore();
	const initialize = vi.spyOn(store, 'initialize').mockResolvedValue();
	const setSearch = vi.spyOn(store, 'setSearch');
	const wrapper = await mountPage();
	expect(initialize).toHaveBeenCalledTimes(1);
	await wrapper.get('input[placeholder="Search order, batch or recipient"]').setValue('WM-100');
	expect(setSearch).toHaveBeenCalledWith('WM-100');
});
```

Add:

```ts
it('keeps the table usable and presents option-load failure', async () => {
	vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockRejectedValue(new Error('Options unavailable'));
	const wrapper = await mountPage();
	await flushPromises();
	expect(wrapper.find('[data-testid="pending-empty"]').exists()).toBe(true);
	expect(useAppUiStore().toastNotification).toMatchObject({ color: 'error', description: 'Options unavailable' });
});
```

Add emitted-intent assertions using the existing rendered controls:

```ts
const setShippingMethod = vi.spyOn(store, 'setShippingMethod');
const setDateRange = vi.spyOn(store, 'setDateRange');
const setPage = vi.spyOn(store, 'setPage').mockResolvedValue();
const setPageSize = vi.spyOn(store, 'setPageSize').mockResolvedValue();
const clearFilters = vi.spyOn(store, 'clearFilters').mockResolvedValue();
const refreshPending = vi.spyOn(store, 'refreshPending').mockResolvedValue({ status: 'completed' });
const exportPending = vi.spyOn(store, 'exportPending').mockResolvedValue({ status: 'completed' });
const dateRange = { start: new Date('2026-07-01'), end: new Date('2026-07-18') };
wrapper.findComponent({ name: 'USelectMenu' }).vm.$emit('update:modelValue', 7);
expect(setShippingMethod).toHaveBeenCalledWith(7);
wrapper.findComponent({ name: 'ZDateRange' }).vm.$emit('update:modelValue', dateRange);
expect(setDateRange).toHaveBeenCalledWith(dateRange);
wrapper.findComponent({ name: 'UPagination' }).vm.$emit('update:page', 2);
expect(setPage).toHaveBeenCalledWith(2);
wrapper.findComponent({ name: 'ZTableToolbar' }).vm.$emit('update:modelValue', 25);
expect(setPageSize).toHaveBeenCalledWith(25);
await wrapper.get('[data-testid="clear-filters"]').trigger('click');
expect(clearFilters).toHaveBeenCalledTimes(1);
await wrapper.get('[data-testid="refresh-pending"]').trigger('click');
expect(refreshPending).toHaveBeenCalledTimes(1);
await wrapper.get('[data-testid="workflow-export"]').trigger('click');
expect(exportPending).toHaveBeenCalledTimes(1);
```

File-input and modal-emitted tests assert `previewWorkbook(file)` and `applyPreview()` respectively. Use the production selector `workflow-export`; delete the stale `export-pending` selector.

- [ ] **Step 2: Run red**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-page.nuxt.spec.ts
```

Expected: FAIL because the page still mutates state and coordinates watchers/actions itself.

- [ ] **Step 3: Replace writable bindings with explicit intent**

Use this pattern for every workflow control:

```vue
<UInput :model-value="store.filters.search" @update:model-value="store.setSearch" />
<USelectMenu :model-value="store.filters.shippingMethodId" @update:model-value="store.setShippingMethod" />
<ZDateRange :model-value="store.filters.dateRange" hide-presets @update:model-value="store.setDateRange" />
<ZTableToolbar :model-value="store.pageSize" @update:model-value="store.setPageSize" />
<UPagination :page="store.page" :items-per-page="store.pageSize" :total="store.total" @update:page="store.setPage" />
```

Keep all existing labels, items, classes, icons, and table-column bindings on these tags.

- [ ] **Step 4: Replace page wrappers with outcome presentation**

```ts
const exportPending = async (): Promise<void> => {
	const outcome = await store.exportPending();
	if (outcome.status === 'completed') successNotification(t('shipmentArrangement.notifications.exported'));
	else failedNotification(outcome.failure.message);
};

const onFileSelected = async (event: Event): Promise<void> => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	const outcome = await store.previewWorkbook(file);
	if (outcome.status === 'completed') previewOpen.value = true;
	else if (outcome.failure.kind === 'unsupported_workbook') failedNotification(t('shipmentArrangement.states.invalidFile'));
	else failedNotification(outcome.failure.message);
};
```

For apply, notify failed transport messages, successful counts, and partial counts from the returned outcome. `onMounted` awaits `store.initialize()` and presents `optionsFailure` once. `onBeforeUnmount` calls `store.dispose()`.

- [ ] **Step 5: Return only read-only workflow state and delete legacy names**

Return computed snapshots for filters, page, page size, rows, total, `firstVisibleRow`, `lastVisibleRow`, `activeShippingMethods`, `preview`, `eligibleCount`, `applyResult`, all four operation flags, and all five operation failures. The writable core begins:

```ts
filters: computed(() => ({
	search: searchState.value,
	shippingMethodId: shippingMethodIdState.value,
	dateRange: { ...dateRangeState.value },
})),
page: computed(() => pageState.value),
pageSize: computed(() => pageSizeState.value),
rows: computed<readonly ShipmentArrangementListRow[]>(() => rowsState.value),
```

Delete `fetchPending`, `previewFile`, `resetPreview`, writable returned refs, and temporary delegates. Implement `$reset()` by calling cleanup, restoring initial private state, and clearing operation state.

Before removing writable state, replace every direct assignment in `test/unit/shipment-arrangement-store.spec.ts` with `setSearch`, `setShippingMethod`, `setDateRange`, `setPage`, `setPageSize`, `previewWorkbook`, `dismissImport`, or `$reset`. Replace the Nuxt suite's manual before-each assignments with `store.$reset()` and seed rendering state through in-memory repository responses.

- [ ] **Step 6: Run store and page tests, then commit**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/shipment-arrangement-store.spec.ts
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-page.nuxt.spec.ts
git add app/stores/ShipmentArrangement/ShipmentArrangement.ts app/pages/orders/shipment-arrangement.vue test/nuxt/shipment-arrangement-page.nuxt.spec.ts
git commit -m "refactor(shipment-arrangement): consume semantic Pinia workflow"
```

Expected: both focused files PASS before commit.

### Task 5: Make the preview modal prop-driven

**Files:**

- Modify: `app/components/ShipmentArrangement/ImportPreviewModal.vue`
- Modify: `app/pages/orders/shipment-arrangement.vue`
- Modify: `test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts`
- Modify: `test/nuxt/shipment-arrangement-page.nuxt.spec.ts`

**Interfaces:**

- Consumes: Task 4 read-only preview state.
- Produces: preview/apply props plus `apply` and `dismiss` events; removes modal access to Pinia.

- [ ] **Step 1: Rewrite modal tests against props and add emitted-intent coverage**

Pass `preview`, `eligibleCount`, `applyResult`, `applying`, and `error` through `mountSuspended` props instead of mutating Pinia. Add:

```ts
it('emits apply intent without reaching into Pinia', async () => {
	const wrapper = await mountModal({ preview, eligibleCount: 2 });
	await wrapper.get('[data-testid="apply-shipments"]').trigger('click');
	expect(wrapper.emitted('apply')).toHaveLength(1);
});
```

Add a close case asserting `dismiss` is emitted once.

```ts
const close = wrapper.findAll('button').find(button => button.text().includes('Cancel'));
expect(close).toBeDefined();
await close!.trigger('click');
expect(wrapper.emitted('dismiss')).toHaveLength(1);
```

- [ ] **Step 2: Run red**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts
```

Expected: FAIL because the modal reads Pinia and lacks the prop/event contract.

- [ ] **Step 3: Implement props and events**

```ts
const props = withDefaults(defineProps<{
	preview?: ShipmentArrangementPreviewResponse;
	eligibleCount: number;
	applyResult?: ShipmentArrangementApplyResponse;
	applying?: boolean;
	error?: string;
}>(), {
	preview: undefined,
	applyResult: undefined,
	applying: false,
	error: undefined,
});

const emit = defineEmits<{ apply: []; dismiss: [] }>();
```

Remove `useShipmentArrangementStore` and compute translated summary labels from props. Emit `dismiss` when the modal closes.

```ts
watch(open, (value) => {
	if (!value) emit('dismiss');
});
```

- [ ] **Step 4: Pass the store state from the page**

```vue
<ShipmentArrangementImportPreviewModal
	v-model="previewOpen"
	:preview="store.preview"
	:eligible-count="store.eligibleCount"
	:apply-result="store.applyResult"
	:applying="store.applying"
	:error="store.applyFailure?.kind === 'request_failed' ? store.applyFailure.message : undefined"
	@apply="applyPreview"
	@dismiss="store.dismissImport"
/>
```

- [ ] **Step 5: Run both Nuxt files and commit**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-page.nuxt.spec.ts test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts
git add app/components/ShipmentArrangement/ImportPreviewModal.vue app/pages/orders/shipment-arrangement.vue test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts test/nuxt/shipment-arrangement-page.nuxt.spec.ts
git commit -m "refactor(shipment-arrangement): isolate preview rendering"
```

Expected: both files PASS before commit.

### Task 6: Verify the deep seam and remove displaced coordination

**Files:**

- Verify/modify: the four production files and four focused test files from Tasks 1–5
- Verify only: `test/nuxt/shipment-arrangement-navigation.nuxt.spec.ts`

**Interfaces:**

- Consumes: completed workflow.
- Produces: final target interface with no shallow compatibility path and fresh verification evidence.

- [ ] **Step 1: Prove displaced coordination is gone**

```bash
rg -n "resettingFilters|filterRefreshGeneration|refreshForFilterChange|useDebounceFn|store\.filters\.[A-Za-z]+\s*=|store\.page\s*=|store\.pageSize\s*=|fetchPending|previewFile|resetPreview" app/pages/orders/shipment-arrangement.vue app/components/ShipmentArrangement/ImportPreviewModal.vue test/nuxt/shipment-arrangement-*.spec.ts
rg -n "useShipmentArrangementStore" app/components/ShipmentArrangement/ImportPreviewModal.vue
```

Expected: no matches. Replace any test fixture mutation with a public action or in-memory repository outcome.

- [ ] **Step 2: Run the complete focused tests**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run --project unit test/unit/shipment-arrangement-store.spec.ts test/unit/fulfillment-shipping-stores.spec.ts
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/shipment-arrangement-page.nuxt.spec.ts test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts test/nuxt/shipment-arrangement-navigation.nuxt.spec.ts
```

Expected: zero failed tests.

- [ ] **Step 3: Run targeted ESLint with the known import fixed temporarily**

Use `apply_patch` to change `import withNuxt from '.nuxt/eslint.config.mjs';` to `import withNuxt from './.nuxt/eslint.config.mjs';`. Run:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx eslint app/stores/ShipmentArrangement/ShipmentArrangement.ts app/stores/ShippingMethod/ShippingMethod.ts app/pages/orders/shipment-arrangement.vue app/components/ShipmentArrangement/ImportPreviewModal.vue test/unit/shipment-arrangement-store.spec.ts test/unit/fulfillment-shipping-stores.spec.ts test/nuxt/shipment-arrangement-page.nuxt.spec.ts test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts
```

Expected: exit 0. Immediately restore the tracked import with `apply_patch` and confirm `git diff -- eslint.config.mjs` is empty. Do not stage it.

- [ ] **Step 4: Run typecheck and classify baseline failures**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npm run typecheck
```

Expected baseline: non-zero from unrelated Vue router/Volar diagnostics. Fix every new diagnostic mentioning `ShipmentArrangement`, `shipment-arrangement`, or the changed Shipping Method action.

- [ ] **Step 5: Inspect scope and design coverage**

```bash
git diff --check
git status --short
git diff --stat
```

Verify all grilled decisions: one existing store, semantic actions/outcomes, read-only state, newest-list acceptance, independent option failure, 300 ms debounce, retained context, explicit dismissal, apply preconditions, partial results, and test ownership.

- [ ] **Step 6: Commit final cleanup only if verification changed phase files**

```bash
git add app/stores/ShipmentArrangement/ShipmentArrangement.ts app/stores/ShippingMethod/ShippingMethod.ts app/pages/orders/shipment-arrangement.vue app/components/ShipmentArrangement/ImportPreviewModal.vue test/unit/shipment-arrangement-store.spec.ts test/unit/fulfillment-shipping-stores.spec.ts test/nuxt/shipment-arrangement-page.nuxt.spec.ts test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts
git commit -m "test(shipment-arrangement): verify deep Pinia workflow"
```

Skip the commit when verification required no tracked changes.
