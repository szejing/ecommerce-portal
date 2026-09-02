import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EASYPARCEL, GROUP_CODE } from 'yeppi-common';
import { useEasyParcelConnection } from '../../app/composables/useEasyParcelConnection';
import { useSettingStore } from '../../app/stores/Setting/Setting';
import { Setting } from '../../app/utils/types/setting';

describe('useEasyParcelConnection', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('returns connected when EasyParcel Connection setting has a value', () => {
		const store = useSettingStore();
		store.settings = [
			new Setting({
				group_code: GROUP_CODE.EASYPARCEL,
				set_code: EASYPARCEL.CONNECTION,
				set_value: 'merchant@example.com',
			} as Setting),
		];

		const { isConnected } = useEasyParcelConnection();
		expect(isConnected.value).toBe(true);
	});

	it('returns disconnected when Connection setting is empty', () => {
		const store = useSettingStore();
		store.settings = [
			new Setting({
				group_code: GROUP_CODE.EASYPARCEL,
				set_code: EASYPARCEL.CONNECTION,
				set_value: '',
			} as Setting),
		];

		const { isConnected } = useEasyParcelConnection();
		expect(isConnected.value).toBe(false);
	});
});
