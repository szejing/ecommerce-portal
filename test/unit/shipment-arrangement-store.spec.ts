import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { KEY } from 'yeppi-common';
import type {
	ShipmentArrangementApplyError,
	ShipmentArrangementListResponse,
	ShipmentArrangementPreviewResponse,
} from '../../app/utils/types/shipment-arrangement';
import { useShippingMethodStore } from '../../app/stores/ShippingMethod/ShippingMethod';
import { useShipmentArrangementStore } from '../../app/stores/ShipmentArrangement/ShipmentArrangement';

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

const getShipmentArrangement = vi.fn();
const downloadShipmentArrangement = vi.fn();
const previewShipmentArrangement = vi.fn();
const applyShipmentArrangement = vi.fn();
const createObjectURL = vi.fn(() => 'blob:shipment-arrangement');
const revokeObjectURL = vi.fn();
const click = vi.fn();

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

const previewResponse: ShipmentArrangementPreviewResponse = {
	total: 3,
	valid: 1,
	warnings: 1,
	errors: 1,
	rows: [
		{
			fulfillment_id: '11111111-1111-4111-8111-111111111111',
			source_updated_at: '2026-07-18T01:00:00.000Z',
			order_no: 'WM-100',
			batch_no: 1,
			ordered_at: '2026-07-17T01:00:00.000Z',
			recipient: 'Alice',
			destination: 'Selangor',
			shipping_method: 'Standard',
			row_number: 2,
			courier: 'Pos Laju',
			tracking_no: 'PL-100',
			status: 'valid',
			messages: [],
		},
		{
			fulfillment_id: '22222222-2222-4222-8222-222222222222',
			source_updated_at: '2026-07-18T02:00:00.000Z',
			order_no: 'WM-101',
			batch_no: 2,
			ordered_at: '2026-07-17T02:00:00.000Z',
			recipient: 'Bob',
			destination: 'Johor',
			shipping_method: 'Express',
			row_number: 3,
			courier: '',
			tracking_no: 'WM-101-TRACK',
			status: 'warning',
			messages: ['Courier is blank'],
		},
		{
			fulfillment_id: '33333333-3333-4333-8333-333333333333',
			source_updated_at: '2026-07-18T03:00:00.000Z',
			order_no: 'WM-102',
			batch_no: 1,
			ordered_at: '2026-07-17T03:00:00.000Z',
			recipient: 'Carol',
			destination: 'Penang',
			shipping_method: 'Standard',
			row_number: 4,
			courier: 'DHL',
			tracking_no: '',
			status: 'error',
			messages: ['Tracking number is required'],
		},
	],
};

const applyError: ShipmentArrangementApplyError = {
	fulfillment_id: '22222222-2222-4222-8222-222222222222',
	order_no: 'WM-101',
	batch_no: 2,
	message: 'Fulfillment changed after export',
};

describe('useShipmentArrangementStore', () => {
	afterEach(() => vi.useRealTimers());

	beforeEach(() => {
		setActivePinia(createPinia());
		getShipmentArrangement.mockReset();
		downloadShipmentArrangement.mockReset();
		previewShipmentArrangement.mockReset();
		applyShipmentArrangement.mockReset();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		click.mockClear();
		getShipmentArrangement.mockResolvedValue({ data: [], total: 0 });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: {
				fulfillment: {
					getShipmentArrangement,
					downloadShipmentArrangement,
					previewShipmentArrangement,
					applyShipmentArrangement,
				},
			},
		});
		(globalThis as unknown as { useCookie: (key: string) => { value: string } }).useCookie = (key) => ({
			value: key === KEY.X_MERCHANT_ID ? 'merchant-1' : '',
		});
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ href: '', download: '', click }),
		};
	});

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

	it('does not accept a failed apply after the workbook session is dismissed', async () => {
		const pendingApply = deferred<never>();
		previewShipmentArrangement.mockResolvedValue(previewResponse);
		applyShipmentArrangement.mockReturnValueOnce(pendingApply.promise);
		const store = useShipmentArrangementStore();
		await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));

		const apply = store.applyPreview();
		store.dismissImport();
		pendingApply.reject(new Error('Late apply failure'));

		expect(await apply).toEqual({
			status: 'failed',
			failure: { kind: 'request_failed', message: 'Late apply failure' },
		});
		expect(store.preview).toBeUndefined();
		expect(store.applyResult).toBeUndefined();
		expect(store.applyFailure).toBeUndefined();
		expect(store.applying).toBe(false);
		expect(getShipmentArrangement).not.toHaveBeenCalled();
	});

	it('does not accept a preview response after the workbook session is dismissed', async () => {
		const pendingPreview = deferred<ShipmentArrangementPreviewResponse>();
		previewShipmentArrangement.mockReturnValueOnce(pendingPreview.promise);
		const store = useShipmentArrangementStore();
		const preview = store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));

		store.dismissImport();
		pendingPreview.resolve(previewResponse);
		await preview;

		expect(store.preview).toBeUndefined();
		expect(store.importFailure).toBeUndefined();
		expect(store.importing).toBe(false);
	});

	it('does not let an older apply populate or refresh a newer workbook session', async () => {
		const pendingApply = deferred<{ total: number; updated: number; failed: number; errors: [] }>();
		const newerPreview = {
			...previewResponse,
			total: 1,
			valid: 1,
			warnings: 0,
			errors: 0,
			rows: [previewResponse.rows[1]!],
		};
		previewShipmentArrangement.mockResolvedValueOnce(previewResponse).mockResolvedValueOnce(newerPreview);
		applyShipmentArrangement.mockReturnValueOnce(pendingApply.promise);
		const store = useShipmentArrangementStore();
		await store.previewWorkbook(new File(['old'], 'old.xlsx'));
		const oldApply = store.applyPreview();

		await store.previewWorkbook(new File(['new'], 'new.xlsx'));
		pendingApply.resolve({ total: 2, updated: 2, failed: 0, errors: [] });
		await oldApply;

		expect(store.preview).toEqual(newerPreview);
		expect(store.applyResult).toBeUndefined();
		expect(store.applyFailure).toBeUndefined();
		expect(store.applying).toBe(false);
		expect(getShipmentArrangement).not.toHaveBeenCalled();
	});

	it('does not accept an apply-owned list refresh after dismissal', async () => {
		const pendingRefresh = deferred<ShipmentArrangementListResponse>();
		previewShipmentArrangement.mockResolvedValue(previewResponse);
		applyShipmentArrangement.mockResolvedValue({ total: 2, updated: 2, failed: 0, errors: [] });
		getShipmentArrangement.mockReturnValueOnce(pendingRefresh.promise);
		const store = useShipmentArrangementStore();
		await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
		const apply = store.applyPreview();
		await vi.waitFor(() => expect(getShipmentArrangement).toHaveBeenCalledTimes(1));

		store.dismissImport();
		pendingRefresh.resolve({ data: [previewResponse.rows[0]!], total: 1 });
		await apply;

		expect(store.rows).toEqual([]);
		expect(store.total).toBe(0);
		expect(store.applyResult).toBeUndefined();
		expect(getShipmentArrangement).toHaveBeenCalledTimes(1);
	});

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

	it('stores partial apply results and clamps the refreshed page', async () => {
		previewShipmentArrangement.mockResolvedValue(previewResponse);
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
	});

	it('keeps a completed apply result when the post-apply list refresh fails', async () => {
		previewShipmentArrangement.mockResolvedValue(previewResponse);
		const result = { total: 2, updated: 2, failed: 0, errors: [] };
		applyShipmentArrangement.mockResolvedValue(result);
		const store = useShipmentArrangementStore();
		await store.setPage(3);
		await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
		getShipmentArrangement.mockClear();
		getShipmentArrangement.mockRejectedValue(new Error('List refresh failed'));

		expect(await store.applyPreview()).toEqual({ status: 'completed', result });
		expect(store.applyResult).toEqual(result);
		expect(store.listFailure).toEqual({ kind: 'request_failed', message: 'List refresh failed' });
		expect(store.applyFailure).toBeUndefined();
		expect(store.page).toBe(3);
		expect(getShipmentArrangement).toHaveBeenCalledTimes(1);
	});

	it('previews multipart files and applies only valid/warning rows', async () => {
		previewShipmentArrangement.mockResolvedValue(previewResponse);
		applyShipmentArrangement.mockResolvedValue({ total: 2, updated: 1, failed: 1, errors: [applyError] });
		const store = useShipmentArrangementStore();
		const file = new File(['xlsx'], 'shipments.xlsx');

		await store.previewWorkbook(file);
		await store.applyPreview();

		expect(previewShipmentArrangement).toHaveBeenCalledWith(file);
		expect(applyShipmentArrangement).toHaveBeenCalledWith({
			merchant_id: 'merchant-1',
			rows: previewResponse.rows.filter((row) => row.status !== 'error').map((row) => ({
				fulfillment_id: row.fulfillment_id,
				source_updated_at: row.source_updated_at,
				order_no: row.order_no,
				batch_no: row.batch_no,
				courier: row.courier,
				tracking_no: row.tracking_no,
			})),
		});
		expect(store.applyResult?.updated).toBe(1);
		expect(getShipmentArrangement).toHaveBeenCalledWith({ $top: 15, $skip: 0 });
	});

	it('clamps and refetches when applying the only row on the final page', async () => {
		previewShipmentArrangement.mockResolvedValue({
			...previewResponse,
			total: 1,
			valid: 1,
			warnings: 0,
			errors: 0,
			rows: [previewResponse.rows[0]!],
		});
		applyShipmentArrangement.mockResolvedValue({ total: 1, updated: 1, failed: 0, errors: [] });
		const store = useShipmentArrangementStore();
		await store.setPageSize(2);
		await store.setPage(3);
		getShipmentArrangement.mockClear();
		getShipmentArrangement
			.mockResolvedValueOnce({ data: [], total: 4 })
			.mockResolvedValueOnce({ data: previewResponse.rows.slice(0, 2), total: 4 });
		await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));

		await store.applyPreview();

		expect(store.page).toBe(2);
		expect(getShipmentArrangement).toHaveBeenNthCalledWith(1, { $top: 2, $skip: 4 });
		expect(getShipmentArrangement).toHaveBeenNthCalledWith(2, { $top: 2, $skip: 2 });
		expect(store.rows).toHaveLength(2);
		expect(store.total).toBe(4);
	});

	it('does not let an apply refresh clamp over a newer page intent', async () => {
		const applyRefresh = deferred<ShipmentArrangementListResponse>();
		const newerPageRefresh = deferred<ShipmentArrangementListResponse>();
		previewShipmentArrangement.mockResolvedValue(previewResponse);
		applyShipmentArrangement.mockResolvedValue({ total: 2, updated: 2, failed: 0, errors: [] });
		const store = useShipmentArrangementStore();
		await store.setPageSize(2);
		await store.setPage(3);
		await store.previewWorkbook(new File(['xlsx'], 'shipments.xlsx'));
		getShipmentArrangement.mockClear();
		getShipmentArrangement
			.mockReturnValueOnce(applyRefresh.promise)
			.mockReturnValueOnce(newerPageRefresh.promise);

		const apply = store.applyPreview();
		await vi.waitFor(() => expect(getShipmentArrangement).toHaveBeenCalledTimes(1));
		const newerPage = store.setPage(4);
		newerPageRefresh.resolve({ data: [previewResponse.rows[1]!], total: 6 });
		await newerPage;
		applyRefresh.resolve({ data: [], total: 2 });
		await apply;

		expect(store.page).toBe(4);
		expect(store.rows.map(row => row.order_no)).toEqual(['WM-101']);
		expect(store.total).toBe(6);
		expect(getShipmentArrangement).toHaveBeenCalledTimes(2);
	});

	it('keeps date filters empty by default and exports current filters without paging', async () => {
		const blob = new Blob(['xlsx']);
		downloadShipmentArrangement.mockResolvedValue(blob);
		const store = useShipmentArrangementStore();

		expect(store.filters.dateRange).toEqual({ start: undefined, end: undefined });
		store.setSearch(' WM-100 ');
		await store.exportPending();
		store.dispose();

		expect(downloadShipmentArrangement).toHaveBeenCalledWith({ $search: 'WM-100' });
		expect(createObjectURL).toHaveBeenCalledWith(blob);
		expect(click).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:shipment-arrangement');
	});

	it('always revokes an export object URL', async () => {
		downloadShipmentArrangement.mockResolvedValue(new Blob(['xlsx']));
		click.mockImplementationOnce(() => {
			throw new Error('Download blocked');
		});
		const store = useShipmentArrangementStore();
		const outcome = await store.exportPending();
		expect(outcome).toEqual({
			status: 'failed',
			failure: { kind: 'request_failed', message: 'Download blocked' },
		});
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:shipment-arrangement');
		expect(store.exporting).toBe(false);
	});

	it('fetches the current page with shipping method and date filters', async () => {
		vi.useFakeTimers();
		getShipmentArrangement.mockResolvedValue({ data: previewResponse.rows.slice(0, 1), total: 1 });
		const store = useShipmentArrangementStore();
		await store.setPageSize(25);
		store.setShippingMethod(7);
		store.setDateRange({
			start: new Date('2026-07-01T12:00:00.000Z'),
			end: new Date('2026-07-18T12:00:00.000Z'),
		});
		getShipmentArrangement.mockClear();

		await store.setPage(3);

		expect(getShipmentArrangement).toHaveBeenCalledWith({
			$top: 25,
			$skip: 50,
			shipping_method_id: 7,
			start_date: '2026-07-01',
			end_date: '2026-07-18',
		});
		expect(store.rows).toHaveLength(1);
		expect(store.total).toBe(1);
		expect(store.loading).toBe(false);
	});

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

	it('keeps list success when active options fail', async () => {
		getShipmentArrangement.mockResolvedValue({ data: [previewResponse.rows[0]!], total: 1 });
		vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockRejectedValue(new Error('Options unavailable'));
		const store = useShipmentArrangementStore();

		await store.initialize();

		expect(store.rows).toHaveLength(1);
		expect(store.activeShippingMethods).toEqual([]);
		expect(store.optionsFailure).toEqual({ kind: 'request_failed', message: 'Options unavailable' });
	});

	it('preserves filters when initialization re-enters', async () => {
		vi.useFakeTimers();
		vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockResolvedValue([]);
		const store = useShipmentArrangementStore();
		store.setSearch('WM-100');
		await vi.advanceTimersByTimeAsync(300);
		await vi.runAllTicks();
		getShipmentArrangement.mockClear();

		await store.initialize();

		expect(getShipmentArrangement).toHaveBeenCalledWith(expect.objectContaining({ $search: 'WM-100' }));
	});

	it('formats local-midnight dates as their local calendar day', async () => {
		const previousTimeZone = process.env.TZ;
		process.env.TZ = 'Asia/Kuala_Lumpur';
		try {
			const store = useShipmentArrangementStore();
			store.setDateRange({
				start: new Date(2026, 6, 18, 0, 0, 0),
				end: new Date(2026, 6, 18, 0, 0, 0),
			});

			await store.refreshPending();

			expect(getShipmentArrangement).toHaveBeenCalledWith({
				$top: 15,
				$skip: 0,
				start_date: '2026-07-18',
				end_date: '2026-07-18',
			});
		} finally {
			if (previousTimeZone === undefined) {
				delete process.env.TZ;
			} else {
				process.env.TZ = previousTimeZone;
			}
		}
	});

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

	it('sets page size on page one and refreshes immediately', async () => {
		const store = useShipmentArrangementStore();
		await store.setPage(3);
		getShipmentArrangement.mockClear();

		await store.setPageSize(25);

		expect({ page: store.page, pageSize: store.pageSize }).toEqual({ page: 1, pageSize: 25 });
		expect(getShipmentArrangement).toHaveBeenCalledTimes(1);
		expect(getShipmentArrangement).toHaveBeenCalledWith({ $top: 25, $skip: 0 });
	});

	it('debounces date-range intent and refreshes the first page', async () => {
		vi.useFakeTimers();
		const store = useShipmentArrangementStore();
		await store.setPage(2);
		getShipmentArrangement.mockClear();

		store.setDateRange({ start: new Date(2026, 6, 1), end: new Date(2026, 6, 18) });
		await vi.advanceTimersByTimeAsync(300);
		await vi.runAllTicks();

		expect(store.page).toBe(1);
		expect(getShipmentArrangement).toHaveBeenCalledWith({
			$top: 15,
			$skip: 0,
			start_date: '2026-07-01',
			end_date: '2026-07-18',
		});
	});

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

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		vi.useFakeTimers();
		const store = useShipmentArrangementStore();
		const snapshot = store.filters as { search: string };
		snapshot.search = 'direct mutation';
		store.setShippingMethod(7);
		await vi.advanceTimersByTimeAsync(300);
		await vi.runAllTicks();

		expect(getShipmentArrangement).toHaveBeenCalledWith({ $top: 15, $skip: 0, shipping_method_id: 7 });
	});
});
