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
});
