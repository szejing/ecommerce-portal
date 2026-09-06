import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ProductStatus } from 'yeppi-common';
import { PRODUCT_FILTER_DEBOUNCE_MS, useProductStore } from '../../app/stores/Product/Product';
import type { Product } from '../../app/utils/types/product';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

const getMany = vi.fn();
const create = vi.fn();
const importProducts = vi.fn();
const upload = vi.fn();
const uploadMultiple = vi.fn();

const translate = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`;

const workbook = () => new File(['code,name'], 'products.csv', { type: 'text/csv' });

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

const product = (code: string): Product =>
	({
		code,
		name: code,
		status: ProductStatus.PUBLISHED,
	}) as Product;

describe('useProductStore', () => {
	afterEach(() => vi.useRealTimers());

	beforeEach(() => {
		setActivePinia(createPinia());
		getMany.mockReset();
		create.mockReset();
		importProducts.mockReset();
		upload.mockReset();
		uploadMultiple.mockReset();
		successNotification.mockClear();
		failedNotification.mockClear();
		getMany.mockResolvedValue({ data: [product('SKU-1')], '@odata.count': 1 });
		create.mockResolvedValue({ product: product('SKU-1') });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: {
				product: { getMany, create, importProducts },
				image: { upload, uploadMultiple },
			},
			$i18n: { t: translate },
		});
	});

	it('debounces search intent for 500 ms and refreshes page one once', async () => {
		vi.useFakeTimers();
		const store = useProductStore();
		await store.setPage(3);
		getMany.mockClear();
		store.setSearch('  helmet  ');
		await vi.advanceTimersByTimeAsync(PRODUCT_FILTER_DEBOUNCE_MS - 1);
		expect(getMany).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await vi.runAllTicks();
		expect(store.filters.current_page).toBe(1);
		expect(getMany).toHaveBeenCalledTimes(1);
		expect(getMany.mock.calls[0]?.[0].$search).toBe('helmet');
	});

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		vi.useFakeTimers();
		const store = useProductStore();
		const snapshot = store.filters as { query: string };
		snapshot.query = 'direct mutation';
		store.setStatus(ProductStatus.DRAFT);
		await vi.runAllTicks();
		expect(getMany.mock.calls.at(-1)?.[0].$filter).toBe(`status eq '${ProductStatus.DRAFT}'`);
		expect(store.filters.query).toBe('');
	});

	it('lists products with table-only expands', async () => {
		const store = useProductStore();
		await store.refreshListing();
		expect(getMany.mock.calls[0]?.[0].$expand).toBe('price_types,thumbnail,type,variants');
		expect(getMany.mock.calls[0]?.[0].$expand).not.toMatch(/brands|categories|collection|images|tags|variations/);
	});

	it('does not let an older listing request replace rows', async () => {
		const first = deferred<{ data: Product[]; '@odata.count': number }>();
		const second = deferred<{ data: Product[]; '@odata.count': number }>();
		getMany.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const store = useProductStore();
		const oldRequest = store.refreshListing();
		const newRequest = store.setPage(2);
		second.resolve({ data: [product('SKU-2')], '@odata.count': 2 });
		await newRequest;
		first.resolve({ data: [product('SKU-1')], '@odata.count': 1 });
		expect(await oldRequest).toEqual({ status: 'stale' });
		expect(store.products.map((row) => row.code)).toEqual(['SKU-2']);
	});

	it('saveNewDraft persists as inactive draft and returns an outcome without toasting', async () => {
		const store = useProductStore();
		store.new_product.name = 'Draft helmet';
		store.new_product.code = 'SKU-1';
		const outcome = await store.saveNewDraft();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 'SKU-1',
				status: ProductStatus.DRAFT,
				is_active: false,
			}),
		);
		expect(outcome).toEqual({ status: 'completed', product: expect.objectContaining({ code: 'SKU-1' }) });
		expect(successNotification).not.toHaveBeenCalled();
		expect(failedNotification).not.toHaveBeenCalled();
		expect(store.new_product.name).toBe('');
	});

	it('publishNewProduct persists as published and returns a failed outcome without toasting', async () => {
		create.mockRejectedValueOnce({ message: 'SKU exists' });
		const store = useProductStore();
		store.new_product.name = 'Helmet';
		store.new_product.code = 'SKU-1';
		const outcome = await store.publishNewProduct();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 'SKU-1',
				status: ProductStatus.PUBLISHED,
				is_active: true,
			}),
		);
		expect(outcome).toEqual({ status: 'failed', failure: { kind: 'request_failed', message: 'SKU exists' } });
		expect(successNotification).not.toHaveBeenCalled();
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('tracks Import Progress while the import runs', async () => {
		let report: ((progress: { processed: number; total: number | null }) => void) | undefined;
		importProducts.mockImplementation(async (_file, _templateType, options) => {
			report = options.onProgress;
			report?.({ processed: 0, total: null });
			report?.({ processed: 12, total: 40 });
			return { total: 40, created: 40, updated: 0, failed: 0, errors: [], images_attached: 0, image_warnings: [], stopped: false };
		});

		const store = useProductStore();
		await store.importProducts(workbook());

		expect(store.import_processed).toBe(12);
		expect(store.import_total).toBe(40);
		expect(store.importing).toBe(false);
		expect(successNotification).toHaveBeenCalledWith('import.summary:{"created":40,"updated":0}');
	});

	it('reports the partial progress of an import stopped by staff', async () => {
		importProducts.mockImplementation(
			(_file, _templateType, options) =>
				new Promise((_resolve, reject) => {
					options.onProgress?.({ processed: 3, total: 40 });
					options.signal.addEventListener('abort', () => {
						const abort = new Error('Aborted');
						abort.name = 'AbortError';
						reject(abort);
					});
				}),
		);

		const store = useProductStore();
		const pending = store.importProducts(workbook());
		expect(store.import_processed).toBe(3);

		store.stopImportProducts();

		await expect(pending).resolves.toBeUndefined();
		expect(failedNotification).toHaveBeenCalledWith('import.stoppedSummary:{"processed":3,"total":40}');
		expect(store.importing).toBe(false);
	});

	it('reports a backend-stopped import instead of a success summary', async () => {
		importProducts.mockResolvedValue({
			total: 40,
			created: 5,
			updated: 0,
			failed: 0,
			errors: [],
			images_attached: 0,
			image_warnings: [],
			stopped: true,
		});

		const store = useProductStore();
		await store.importProducts(workbook());

		expect(successNotification).not.toHaveBeenCalled();
		expect(failedNotification).toHaveBeenCalledWith('import.stoppedSummaryUnknownTotal:{"processed":0}');
	});
});
