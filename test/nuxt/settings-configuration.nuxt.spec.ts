import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick, ref } from 'vue';
import ConfigurationPage from '~/pages/settings/configuration.vue';
import { Setting } from '~/utils/types/setting';

const leavePageGuard = vi.hoisted(() => vi.fn());

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

const updatedSettings = ref<Setting[]>([]);
const clearUpdatedSettings = vi.fn(() => {
	updatedSettings.value = [];
});
const getMerchantInfos = vi.fn().mockResolvedValue(undefined);
const merchant: unknown[] = [];

mockNuxtImport('useOverlay', () => () => ({
	create: () => ({
		open: vi.fn(),
		close: vi.fn(),
	}),
}));

mockNuxtImport('useLeavePageGuard', () => leavePageGuard);

mockNuxtImport('useSettingStore', () => () => ({
	getSettings: vi.fn().mockResolvedValue(undefined),
	updateSettings: vi.fn().mockResolvedValue(undefined),
	clearUpdatedSettings,
	segments,
	updating: ref(false),
	settings: ref([]),
	updatedSettings,
	addToUpdatedSettings: vi.fn(),
}));

mockNuxtImport('useMerchantInfoStore', () => () => ({
	getMerchantInfos,
	merchant,
}));

function makeDirty() {
	updatedSettings.value = [
		new Setting({
			group_code: 'Email',
			set_code: 'SendWelcome',
			set_value: 'true',
			value_type: 'boolean',
		}),
	];
}

function saveButton(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
	return wrapper.findAllComponents({ name: 'UButton' }).find((button) => button.props('color') === 'success');
}

describe('SettingsConfigurationPage', () => {
	beforeEach(() => {
		getMerchantInfos.mockClear();
		merchant.splice(0);
		updatedSettings.value = [];
		clearUpdatedSettings.mockClear();
		leavePageGuard.mockClear();
	});

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

	it('loads merchant infos when Configuration opens without cached Contact info', async () => {
		await mountSuspended(ConfigurationPage);

		expect(getMerchantInfos).toHaveBeenCalledTimes(1);
	});

	it('disables save until a setting has been changed', async () => {
		const wrapper = await mountSuspended(ConfigurationPage);

		expect(saveButton(wrapper)?.props('disabled')).toBe(true);

		makeDirty();
		await nextTick();

		expect(saveButton(wrapper)?.props('disabled')).toBe(false);
	});

	it('guards navigation and discards pending edits when leaving', async () => {
		await mountSuspended(ConfigurationPage);

		expect(leavePageGuard).toHaveBeenCalledOnce();
		const isDirty = leavePageGuard.mock.calls[0]?.[0] as { value: boolean };
		const options = leavePageGuard.mock.calls[0]?.[1] as { onLeave?: () => void };

		expect(isDirty.value).toBe(false);
		makeDirty();
		expect(isDirty.value).toBe(true);

		options.onLeave?.();
		expect(clearUpdatedSettings).toHaveBeenCalledOnce();
		expect(updatedSettings.value).toHaveLength(0);
	});
});
