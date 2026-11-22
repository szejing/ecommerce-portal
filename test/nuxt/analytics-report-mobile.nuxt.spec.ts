import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { TableColumn } from '@nuxt/ui';
import { describe, expect, it, vi } from 'vitest';
import ReportTable from '~/components/Z/Analytics/ReportTable.vue';

type ReportRow = { name: string; amount: number; quantity: number };

describe('Mobile analytics report', () => {
	it('keeps secondary metrics, totals, and sorting available on a narrow screen', async () => {
		const media = vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener() {},
			removeListener() {},
			addEventListener() {},
			removeEventListener() {},
			dispatchEvent: () => true,
		}));
		const columns: TableColumn<ReportRow>[] = [
			{ accessorKey: 'name', header: 'Product' },
			{
				accessorKey: 'amount',
				header: 'Amount',
				footer: ({ column }) => column.getFacetedRowModel().rows.reduce((sum, row) => sum + row.original.amount, 0),
			},
			{ accessorKey: 'quantity', header: 'Quantity' },
		];

		try {
			const wrapper = await mountSuspended(ReportTable<ReportRow>, {
				props: {
					data: [
						{ name: 'Light', amount: 20, quantity: 2 },
						{ name: 'Stand', amount: 55, quantity: 1 },
					],
					columns,
					columnOptions: [
						{ key: 'name', label: 'Product' },
						{ key: 'amount', label: 'Amount' },
						{ key: 'quantity', label: 'Quantity' },
					],
					primaryKeys: ['name', 'amount'],
					sortableKeys: ['amount'],
				},
			});
			try {
				const rows = () => wrapper.findAll('li');
				expect(wrapper.find('table').exists()).toBe(false);
				expect(rows()[0]?.text()).toContain('Light');
				expect(rows()[0]?.find('details summary').exists()).toBe(true);
				expect(rows()[0]?.get('details').text()).toContain('Quantity');
				expect(wrapper.get('details.border-t').text()).toContain('75');

				wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'amount:desc');
				await wrapper.vm.$nextTick();
				expect(rows()[0]?.text()).toContain('Stand');
			} finally {
				wrapper.unmount();
			}
		} finally {
			media.mockRestore();
		}
	});
});
