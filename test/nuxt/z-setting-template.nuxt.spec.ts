import { beforeEach, describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { GROUP_CODE, InputType, MERCHANT } from 'yeppi-common';
import ZSettingTemplate from '~/components/Z/Setting/Template.vue';
import type { SettingTempl } from '~/utils/types/setting-templ';
import { useMerchantInfoStore } from '~/stores/MerchantInfo/MerchantInfo';
import { useSettingStore } from '~/stores/Setting/Setting';
import { MerchantInfo } from '~/utils/types/merchant-info';

const baseTemplate = {
	group_code: 'Email',
	set_seq_no: 1,
	default_val: '',
	data_source: '',
	is_disabled: false,
	is_internal: false,
} as const;

function makeTemplate(overrides: Partial<SettingTempl> & Pick<SettingTempl, 'set_code' | 'set_desc' | 'input_type'>): SettingTempl {
	return {
		...baseTemplate,
		...overrides,
	};
}

describe('ZSettingTemplate', () => {
	beforeEach(() => {
		const settingStore = useSettingStore();
		const merchantInfoStore = useMerchantInfoStore();
		settingStore.settings = [];
		settingStore.updatedSettings = [];
		merchantInfoStore.merchant = [];
	});

	it('stacks non-boolean controls under the label on mobile', async () => {
		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						set_code: 'PrefixInvoiceNo',
						set_desc: 'Invoice number prefix',
						input_type: InputType.TEXT,
						default_val: 'INV',
					}),
				],
			},
		});

		const row = wrapper.find('.py-3 > .flex.gap-2');
		expect(row.classes()).toContain('flex-col');
		expect(row.classes()).toContain('sm:flex-row');

		const control = row.findAll('div').find((el) => el.classes().includes('w-full'));
		expect(control).toBeTruthy();
		expect(control!.classes()).toContain('sm:min-w-[50%]');
		expect(wrapper.find('.setting-templs-title').exists()).toBe(true);
	});

	it('keeps boolean switches on the same row as the label', async () => {
		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						set_code: 'SendWelcome',
						set_desc: 'Send welcome email',
						input_type: InputType.BOOLEAN,
						default_val: '1',
					}),
				],
			},
		});

		const row = wrapper.find('.py-3 > .flex.gap-2');
		expect(row.classes()).toContain('flex-row');
		expect(row.classes()).not.toContain('flex-col');
		expect(wrapper.findComponent({ name: 'USwitch' }).exists()).toBe(true);
	});

	it('prefills an empty WhatsAppUrl text setting from Contact dial code and phone number once', async () => {
		const settingStore = useSettingStore();
		const merchantInfoStore = useMerchantInfoStore();
		merchantInfoStore.merchant = [
			new MerchantInfo({
				group_code: GROUP_CODE.CONTACT,
				set_code: MERCHANT.DIAL_CODE,
				set_value: '+60',
			}),
			new MerchantInfo({
				group_code: GROUP_CODE.CONTACT,
				set_code: MERCHANT.PHONE_NO,
				set_value: '12-345 6789',
			}),
		];

		await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						group_code: GROUP_CODE.SOCIALMEDIA,
						set_code: 'WhatsAppUrl',
						set_desc: 'WhatsApp URL',
						input_type: InputType.TEXT,
						default_val: '',
					}),
				],
			},
		});

		expect(settingStore.updatedSettings).toHaveLength(1);
		expect(settingStore.updatedSettings[0]).toMatchObject({
			group_code: GROUP_CODE.SOCIALMEDIA,
			set_code: 'WhatsAppUrl',
			set_value: 'https://wa.me/60123456789',
		});
	});

	it('renders Connect Now for disconnected OAUTH settings instead of a text field', async () => {
		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						group_code: 'EasyParcel',
						set_code: 'Connection',
						set_desc: 'EasyParcel Connection',
						input_type: InputType.OAUTH,
						data_source: 'EasyParcel',
					}),
				],
			},
		});

		expect(wrapper.findComponent({ name: 'UInput' }).exists()).toBe(false);
		const connectButton = wrapper.get('[data-testid="oauth-connect"]');
		expect(connectButton.text()).toMatch(/connect now/i);
		expect(connectButton.attributes('href')).toBe('/merchant/oauth/easyparcel/start');
		expect(wrapper.find('[data-testid="oauth-connected"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="oauth-connection-status"]').exists()).toBe(false);
	});

	it('shows a disabled Connected button when an OAUTH connection identity is present', async () => {
		const settingStore = useSettingStore();
		settingStore.settings = [
			{
				group_code: 'EasyParcel',
				set_code: 'Connection',
				set_value: 'merchant@example.com',
			} as never,
		];

		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						group_code: 'EasyParcel',
						set_code: 'Connection',
						set_desc: 'EasyParcel Connection',
						input_type: InputType.OAUTH,
						data_source: 'EasyParcel',
					}),
				],
			},
		});

		expect(wrapper.find('[data-testid="oauth-connect"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="oauth-connection-status"]').exists()).toBe(false);

		const connectedButton = wrapper.get('[data-testid="oauth-connected"]');
		expect(connectedButton.text()).toMatch(/connected/i);
		expect(connectedButton.attributes('disabled')).toBeDefined();
	});

	it('renders the selected SELECT value as a UBadge with the option label', async () => {
		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						set_code: 'ProductLineIdentity',
						set_desc: 'Product line identity',
						input_type: InputType.SELECT,
						data_source: 'ProductLineIdentity',
						default_val: 'CODE',
					}),
				],
			},
		});

		const select = wrapper.findComponent({ name: 'USelect' });
		expect(select.exists()).toBe(true);

		const badges = select.findAllComponents({ name: 'UBadge' });
		expect(badges).toHaveLength(1);
		expect(badges[0]!.text()).toBe('Product code');
	});

	it('renders each selected SELECT_MULTI value as a UBadge with the option label', async () => {
		const settingStore = useSettingStore();
		settingStore.settings = [
			{
				group_code: 'Email',
				set_code: 'AdminReceiveEmailUpdate',
				set_value: 'NEW_ORDER,APPOINTMENT_RESCHEDULE',
			} as never,
		];

		const wrapper = await mountSuspended(ZSettingTemplate, {
			props: {
				templates: [
					makeTemplate({
						group_code: 'Email',
						set_code: 'AdminReceiveEmailUpdate',
						set_desc: 'Admin email updates',
						input_type: InputType.SELECT_MULTI,
						data_source: 'AdminReceiveEmailUpdate',
						default_val: '',
					}),
				],
			},
		});

		const select = wrapper.findComponent({ name: 'USelect' });
		expect(select.exists()).toBe(true);
		expect(select.props('multiple')).toBe(true);

		const badges = select.findAllComponents({ name: 'UBadge' });
		expect(badges.map((badge) => badge.text())).toEqual(['New order', 'Appointment reschedule request']);
	});
});
