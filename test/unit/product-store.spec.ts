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
const upload = vi.fn();
const uploadMultiple = vi.fn();

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
		upload.mockReset();
		uploadMultiple.mockReset();
		successNotification.mockClear();
		failedNotification.mockClear();
		getMany.mockResolvedValue({ data: [product('SKU-1')], '@odata.count': 1 });
		create.mockResolvedValue({ product: product('SKU-1') });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: {
				product: { getMany, create },
				image: { upload, uploadMultiple },
			},
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
});
