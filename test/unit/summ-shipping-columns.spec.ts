import { describe, expect, it, vi } from 'vitest';
import {
	getSummShippingColumns,
	getSummShippingDetailColumns,
	SUMM_SHIPPING_COLUMN_LABELS,
	SUMM_SHIPPING_DETAIL_COLUMN_LABELS,
} from '~/utils/table-columns/analytics/summ-shipping';

vi.mock('#components', () => ({
	UBadge: { name: 'UBadge' },
}));

describe('summ shipping columns', () => {
	const t = (key: string) => key;

	it('includes shipping money accessors for the daily summary', () => {
		const keys = getSummShippingColumns(t).map((column) => ('accessorKey' in column ? column.accessorKey : undefined));
		expect(keys).toEqual([
			'biz_date',
			'currency_code',
			'net_amt',
			'free_shipping_disc_amt',
			'shipping_fee',
			'integrator_charge',
			'total_txns',
			'total_qty',
		]);
	});

	it('labels free-shipping amounts as shipping discount', () => {
		expect(SUMM_SHIPPING_COLUMN_LABELS.free_shipping_disc_amt).toBe('table.shippingDiscount');
		expect(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.free_shipping_disc_amt).toBe('table.shippingDiscount');
	});

	it('includes order and shipment accessors for details', () => {
		const keys = getSummShippingDetailColumns(t).map((column) => ('accessorKey' in column ? column.accessorKey : undefined));
		expect(keys).toEqual([
			'biz_date',
			'order_no',
			'inv_no',
			'shipment_status',
			'net_amt',
			'free_shipping_disc_amt',
			'shipping_fee',
			'integrator_charge',
			'total_qty',
		]);
	});

	it('renders shipment status as a badge cell', () => {
		const column = getSummShippingDetailColumns(t).find((entry) => 'accessorKey' in entry && entry.accessorKey === 'shipment_status');
		expect(column?.cell).toBeTypeOf('function');
	});

	it('right-aligns money and count columns on the daily summary', () => {
		const moneyKeys = ['net_amt', 'free_shipping_disc_amt', 'shipping_fee', 'integrator_charge', 'total_txns', 'total_qty'];
		for (const key of moneyKeys) {
			const column = getSummShippingColumns(t).find((entry) => 'accessorKey' in entry && entry.accessorKey === key);
			expect(column?.meta).toEqual({
				class: {
					th: 'text-right tabular-nums',
					td: 'text-right tabular-nums',
				},
			});
			expect(column?.footer).toBeTypeOf('function');
		}
	});
});
