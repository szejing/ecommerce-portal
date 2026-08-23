import { describe, expect, it, vi } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';
import ConfigurationPage from '~/pages/settings/configuration.vue';

const segments = ref([
	{
		segment_code: 'email',
		parent_segment_code: '',
		segment_desc: 'Email Notifications',
		seq_no: 1,
		setting_templs: [],
		segment_children: [],
	},
	{
		segment_code: 'sales',
		parent_segment_code: '',
		segment_desc: 'Sales Order Settings',
		seq_no: 2,
		setting_templs: [],
		segment_children: [],
	},
	{
		segment_code: 'external',
		parent_segment_code: '',
		segment_desc: 'External Integration',
		seq_no: 3,
		setting_templs: [],
		segment_children: [],
	},
]);

mockNuxtImport('useOverlay', () => () => ({
	create: () => ({
		open: vi.fn(),
		close: vi.fn(),
	}),
}));

mockNuxtImport('useSettingStore', () => () => ({
	getSettings: vi.fn().mockResolvedValue(undefined),
	updateSettings: vi.fn().mockResolvedValue(undefined),
	segments,
	updating: ref(false),
	settings: ref([]),
	updatedSettings: ref([]),
	addToUpdatedSettings: vi.fn(),
}));

describe('SettingsConfigurationPage', () => {
	it('renders scrollable UTabs that keep full segment labels', async () => {
		const wrapper = await mountSuspended(ConfigurationPage);

		const tabs = wrapper.getComponent({ name: 'UTabs' });
		expect(tabs.props('ui')).toMatchObject({
			list: expect.stringContaining('overflow-x-auto'),
			trigger: expect.stringContaining('grow-0'),
			label: expect.stringContaining('whitespace-nowrap'),
		});

		const items = tabs.props('items') as Array<{ label: string }>;
		expect(items.map((item) => item.label)).toEqual([
			'Email Notifications',
			'Sales Order Settings',
			'External Integration',
		]);
	});
});
