import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { ANALYTICS, GROUP_CODE } from 'yeppi-common';
import { Setting } from '~/utils/types/setting';
import GoogleAnalyticsPage from '~/pages/analytics/google-analytics.vue';

const setting = new Setting({
	group_code: GROUP_CODE.ANALYTICS,
	set_code: ANALYTICS.GOOGLE_ANALYTICS_MEASUREMENT_ID,
	set_value: 'G-MERCHANT1',
	value_type: 'string',
} as unknown as Setting);

const settingsStore = {
	updating: false,
	updatedSettings: [] as Setting[],
	getSettings: vi.fn(),
	getSetting: vi.fn(() => setting),
	addToUpdatedSettings: vi.fn((updatedSetting: Setting) => {
		settingsStore.updatedSettings = [updatedSetting];
	}),
	updateSettings: vi.fn(async () => {
		settingsStore.updatedSettings = [];
	}),
};

vi.mock('~/stores/Setting/Setting', () => ({
	useSettingStore: () => settingsStore,
}));

describe('GoogleAnalyticsPage', () => {
	beforeEach(() => {
		setting.set_value = 'G-MERCHANT1';
		settingsStore.updatedSettings = [];
		settingsStore.getSettings.mockClear();
		settingsStore.getSetting.mockClear();
		settingsStore.addToUpdatedSettings.mockClear();
		settingsStore.updateSettings.mockClear();
	});

	it('persists a normalized Measurement ID and removes it through the settings store', async () => {
		const wrapper = await mountSuspended(GoogleAnalyticsPage, {
			global: {
				stubs: {
					ZPagePanel: { template: '<main><slot /><slot name="navbar-right" /></main>' },
				},
			},
		});

		expect(wrapper.find('input[placeholder="G-XXXXXXXXXX"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('GA4 Measurement ID');
		expect(wrapper.findAll('input')).toHaveLength(1);
		expect(wrapper.text()).toContain('Save');
		expect(wrapper.text()).toContain('Remove');

		await wrapper.get('input[placeholder="G-XXXXXXXXXX"]').setValue('g-merchant2');
		await wrapper.get('form').trigger('submit');

		expect(settingsStore.addToUpdatedSettings).toHaveBeenCalledWith(expect.objectContaining({ set_value: 'G-MERCHANT2' }));
		expect(settingsStore.updateSettings).toHaveBeenCalledTimes(1);

		const removeButton = wrapper.findAll('button').find((button) => button.text().includes('Remove'));
		expect(removeButton).toBeDefined();
		await removeButton?.trigger('click');

		expect(settingsStore.addToUpdatedSettings).toHaveBeenLastCalledWith(expect.objectContaining({ set_value: '' }));
		expect(settingsStore.updateSettings).toHaveBeenCalledTimes(2);
	});

	it('does not report a saved Measurement ID when the settings store retains a failed update', async () => {
		settingsStore.updateSettings.mockImplementationOnce(async () => {});
		const wrapper = await mountSuspended(GoogleAnalyticsPage, {
			global: {
				stubs: {
					ZPagePanel: { template: '<main><slot /><slot name="navbar-right" /></main>' },
				},
			},
		});

		await wrapper.get('input[placeholder="G-XXXXXXXXXX"]').setValue('g-merchant2');
		await wrapper.get('form').trigger('submit');

		expect(wrapper.text()).not.toContain('Measurement ID saved.');
	});

	it('clears a previous success status before rendering a later validation error', async () => {
		const wrapper = await mountSuspended(GoogleAnalyticsPage, {
			global: {
				stubs: {
					ZPagePanel: { template: '<main><slot /><slot name="navbar-right" /></main>' },
				},
			},
		});

		await wrapper.get('input[placeholder="G-XXXXXXXXXX"]').setValue('g-merchant2');
		await wrapper.get('form').trigger('submit');
		expect(wrapper.text()).toContain('Measurement ID saved.');

		await wrapper.get('input[placeholder="G-XXXXXXXXXX"]').setValue('invalid');
		await wrapper.get('form').trigger('submit');

		expect(wrapper.text()).not.toContain('Measurement ID saved.');
		expect(wrapper.text()).toContain('Enter a valid GA4 Measurement ID in the format G-XXXXXXXXXX.');
	});
});
