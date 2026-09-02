import { EASYPARCEL, GROUP_CODE } from 'yeppi-common';

export function useEasyParcelConnection() {
	const settingsStore = useSettingStore();

	const isConnected = computed(() => {
		const value = settingsStore.getSetting(GROUP_CODE.EASYPARCEL, EASYPARCEL.CONNECTION)?.set_value ?? '';
		return value.trim().length > 0;
	});

	return { isConnected };
}
