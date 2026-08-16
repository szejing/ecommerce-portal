import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import { GROUP_CODE } from 'yeppi-common';
import { MerchantInfo } from '../../app/utils/types/merchant-info';
import { STORE_THEME_PRIMARY_COLOUR_SET_CODE } from '../../app/utils/store-theme';

const successNotification = vi.fn();
const failedNotification = vi.fn();

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

describe('useMerchantInfoStore Store Theme', () => {
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

	it('reads Store Theme primary colour from merchant_info, not Document Brand', async () => {
		const { useMerchantInfoStore } = await import('../../app/stores/MerchantInfo/MerchantInfo');
		const store = useMerchantInfoStore();
		store.merchant = [
			new MerchantInfo({
				group_code: GROUP_CODE.INFO,
				set_code: STORE_THEME_PRIMARY_COLOUR_SET_CODE,
				set_value: '#C41E3A',
			}),
		];

		expect(store.storeThemePrimaryColour).toBe('#C41E3A');
	});

	it('round-trips ThemePrimaryColour through saveMany', async () => {
		saveMany.mockResolvedValue({
			data: [
				new MerchantInfo({
					group_code: GROUP_CODE.INFO,
					set_code: STORE_THEME_PRIMARY_COLOUR_SET_CODE,
					set_value: '#0F766E',
				}),
			],
		});

		const { useMerchantInfoStore } = await import('../../app/stores/MerchantInfo/MerchantInfo');
		const store = useMerchantInfoStore();
		store.addToUpdatedInfo({
			group_code: GROUP_CODE.INFO,
			set_code: STORE_THEME_PRIMARY_COLOUR_SET_CODE,
			set_value: '#0F766E',
		});

		await store.updateMerchantInfo();

		expect(saveMany).toHaveBeenCalledWith({
			merchant_info: [
				expect.objectContaining({
					group_code: GROUP_CODE.INFO,
					set_code: STORE_THEME_PRIMARY_COLOUR_SET_CODE,
					set_value: '#0F766E',
				}),
			],
		});
		expect(store.storeThemePrimaryColour).toBe('#0F766E');
		expect(store.updatedInfo).toEqual([]);
	});
});
