import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ZTableToolbar from '~/components/Z/TableToolbar.vue';

describe('ZTableToolbar', () => {
	it('hides column selection when column options are not provided', async () => {
		const wrapper = await mountSuspended(ZTableToolbar, {
			props: {
				modelValue: 25,
				pageSizeOptions: [10, 25, 50],
				exportEnabled: false,
			},
		});

		expect(wrapper.findComponent({ name: 'USelectMenu' }).exists()).toBe(false);
	});

	it('shows column selection when column options are provided', async () => {
		const columnOptions = [
			{ key: 'order_no', label: 'Order No' },
			{ key: 'total', label: 'Total' },
		];

		const wrapper = await mountSuspended(ZTableToolbar, {
			props: {
				modelValue: 25,
				pageSizeOptions: [10, 25, 50],
				exportEnabled: false,
				columnOptions,
				selectedColumnKeys: ['order_no'],
				'onUpdate:selectedColumnKeys': (value: string[]) => wrapper.setProps({ selectedColumnKeys: value }),
			},
		});

		const menu = wrapper.findComponent({ name: 'USelectMenu' });

		expect(menu.exists()).toBe(true);
		expect(menu.props('items')).toEqual(columnOptions);
		expect(menu.props('multiple')).toBe(true);
		expect(menu.props('modelValue')).toEqual(['order_no']);
		expect(menu.props('size')).toBe('sm');
		expect(menu.props('icon')).toBe('i-heroicons-view-columns');
		expect(menu.findComponent({ name: 'UButton' }).exists()).toBe(false);
	});
});
