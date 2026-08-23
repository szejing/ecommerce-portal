import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, defineStore, setActivePinia } from 'pinia';

const { failedNotification, successNotification } = vi.hoisted(() => ({
	failedNotification: vi.fn(),
	successNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	failedNotification,
	successNotification,
}));

describe('useProductCategoryStore getCategoriesForTree', () => {
	const getMany = vi.fn();

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () =>
			({
				$api: {
					category: { getMany },
				},
			}) as unknown;
	});

	it('requests the tree with $count only (no nested $expand)', async () => {
		getMany.mockResolvedValue({
			data: [{ code: 'ROOT', category_children: [] }],
			'@odata.count': 1,
		});

		const { useProductCategoryStore } = await import(
			'../../app/stores/ProductCategory/ProductCategory'
		);
		const store = useProductCategoryStore();
		await store.getCategoriesForTree();

		expect(getMany).toHaveBeenCalledWith({ $count: true });
		expect(store.categories).toHaveLength(1);
		expect(store.total_categories).toBe(1);
	});
});

describe('useMerchantInfoStore getMerchantInfos', () => {
	const getMany = vi.fn();

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		(globalThis as unknown as { defineStore: typeof defineStore }).defineStore =
			defineStore;
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () =>
			({
				$api: {
					merchantInfo: { getMany },
					currency: { getCurrencies: vi.fn() },
				},
			}) as unknown;
	});

	it('requests merchant info with $top within the API max of 100', async () => {
		getMany.mockResolvedValue({ data: [] });

		const { useMerchantInfoStore } = await import(
			'../../app/stores/MerchantInfo/MerchantInfo'
		);
		const store = useMerchantInfoStore();
		await store.getMerchantInfos();

		expect(getMany).toHaveBeenCalledWith({
			$count: true,
			$top: 100,
		});
	});
});
