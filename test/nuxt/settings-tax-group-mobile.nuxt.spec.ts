import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { useNuxtApp } from '#imports';
import GroupCreation from '~/components/Form/Tax/GroupCreation.vue';

describe('Tax group settings', () => {
	it('creates a tax group with the selected tax codes and reports a successful save', async () => {
		const api = useNuxtApp().$api.taxGroup;
		const created = { code: 'STANDARD', description: 'Standard rates', taxes: [] };
		const create = vi.spyOn(api, 'create').mockResolvedValue({ tax_group: created });
		const list = vi.spyOn(api, 'getMany').mockResolvedValue({
			'data': [created],
			'value': [created],
			'count': 1,
			'@odata.count': 1,
		});
		const wrapper = await mountSuspended(GroupCreation, {
			global: {
				stubs: {
					ZInputTaxGroupGeneralInfo: {
						props: ['code', 'description', 'taxes'],
						emits: ['update:code', 'update:description', 'update:taxes'],
						template: '<button type="button" @click="$emit(\'update:code\', \'STANDARD\'); $emit(\'update:description\', \'Standard rates\'); $emit(\'update:taxes\', [{ code: \'SST\' }])">Choose tax</button>',
					},
				},
			},
		});
		try {
			await wrapper.get('button[type="button"]').trigger('click');
			await wrapper.get('form').trigger('submit');
			await flushPromises();

			expect(create).toHaveBeenCalledWith({ code: 'STANDARD', description: 'Standard rates', tax_codes: ['SST'] });
			expect(wrapper.emitted('saved')).toHaveLength(1);
		} finally {
			wrapper.unmount();
			create.mockRestore();
			list.mockRestore();
		}
	});
});
