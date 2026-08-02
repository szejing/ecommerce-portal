import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import SettingsIndexPage from '~/pages/settings/index.vue';
import SettingsSystemIndexPage from '~/pages/settings/system/index.vue';

describe('SettingsSystemIndexPage', () => {
	it('renders system settings hub with configuration, reasons, and activity logs links', async () => {
		const wrapper = await mountSuspended(SettingsSystemIndexPage);

		expect(wrapper.text()).toContain('System');
		expect(wrapper.text()).toContain('Configuration');
		expect(wrapper.text()).toContain('Reasons');
		expect(wrapper.text()).toContain('Activity Logs');
	});
});

describe('SettingsIndexPage', () => {
	it('links to Template Studio with customer email and PDF branding copy', async () => {
		const wrapper = await mountSuspended(SettingsIndexPage);

		expect(wrapper.text()).toContain('Template Studio');
		expect(wrapper.text()).toContain('customer emails and PDF branding');
		expect(wrapper.find('a[href="/settings/templates"]').exists()).toBe(true);
	});
});
