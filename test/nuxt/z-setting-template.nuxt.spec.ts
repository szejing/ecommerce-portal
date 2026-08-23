import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { InputType } from 'yeppi-common';
import ZSettingTemplate from '~/components/Z/Setting/Template.vue';
import type { SettingTempl } from '~/utils/types/setting-templ';

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

		const row = wrapper.find('.flex.gap-2');
		expect(row.classes()).toContain('flex-col');
		expect(row.classes()).toContain('sm:flex-row');

		const control = row.findAll('div').find((el) => el.classes().includes('w-full'));
		expect(control).toBeTruthy();
		expect(control!.classes()).toContain('sm:min-w-[50%]');
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

		const row = wrapper.find('.flex.gap-2');
		expect(row.classes()).toContain('flex-row');
		expect(row.classes()).not.toContain('flex-col');
		expect(wrapper.findComponent({ name: 'USwitch' }).exists()).toBe(true);
	});
});
