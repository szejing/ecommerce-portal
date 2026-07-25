import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { GROUP_CODE, MERCHANT } from 'yeppi-common';
import { MerchantInfo } from '../../app/utils/types/merchant-info';

const successNotification = vi.fn();
const failedNotification = vi.fn();

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

describe('useMerchantInfoStore hide_store', () => {
	const saveMany = vi.fn();

	beforeEach(() => {
		setActivePinia(createPinia());
		saveMany.mockReset();
		successNotification.mockReset();
		failedNotification.mockReset();
		(globalThis as unknown as { defineStore: typeof defineStore }).defineStore = defineStore;
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () =>
			({
				$api: {
					merchantInfo: {
						saveMany,
					},
				},
			}) as unknown;
	});

	it('setHideStore posts HideStore=false and clears isStoreHidden', async () => {
		saveMany.mockResolvedValue({
			data: [
				new MerchantInfo({
					group_code: GROUP_CODE.INFO,
					set_code: MERCHANT.HIDE_STORE,
					set_value: 'false',
				}),
			],
		});

		const { useMerchantInfoStore } = await import('../../app/stores/MerchantInfo/MerchantInfo');
		const store = useMerchantInfoStore();
		store.merchant = [
			new MerchantInfo({
				group_code: GROUP_CODE.INFO,
				set_code: MERCHANT.HIDE_STORE,
				set_value: 'true',
			}),
		];

		expect(store.isStoreHidden).toBe(true);

		await store.setHideStore(false);

		expect(saveMany).toHaveBeenCalledWith({
			merchant_info: [
				expect.objectContaining({
					group_code: GROUP_CODE.INFO,
					set_code: MERCHANT.HIDE_STORE,
					set_value: 'false',
				}),
			],
		});
		expect(store.isStoreHidden).toBe(false);
		expect(successNotification).toHaveBeenCalled();
	});

	it('setHideStore posts HideStore=true when hiding', async () => {
		saveMany.mockResolvedValue({
			data: [
				new MerchantInfo({
					group_code: GROUP_CODE.INFO,
					set_code: MERCHANT.HIDE_STORE,
					set_value: 'true',
				}),
			],
		});

		const { useMerchantInfoStore } = await import('../../app/stores/MerchantInfo/MerchantInfo');
		const store = useMerchantInfoStore();

		await store.setHideStore(true);

		expect(saveMany).toHaveBeenCalledWith({
			merchant_info: [
				expect.objectContaining({
					group_code: GROUP_CODE.INFO,
					set_code: MERCHANT.HIDE_STORE,
					set_value: 'true',
				}),
			],
		});
		expect(store.isStoreHidden).toBe(true);
	});
});
