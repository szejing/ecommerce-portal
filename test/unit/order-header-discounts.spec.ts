import { describe, expect, it } from 'vitest';
import { visibleOrderHeaderDiscounts } from '../../app/utils/order-header-discounts';
import type { OrderDiscountModel } from '../../app/utils/models/order-discount.model';

function discount(overrides: Partial<OrderDiscountModel> = {}): OrderDiscountModel {
	return {
		disc_line: 1,
		disc_code: 'SAVE10',
		disc_desc: 'Save 10',
		disc_method: 'percentage',
		disc_rate: 10,
		base_amt: 100,
		disc_amt: 10,
		adj_amt: 0,
		max_disc_amt: 0,
		...overrides,
	};
}

describe('visibleOrderHeaderDiscounts', () => {
	it('keeps header rows with a non-zero amount', () => {
		expect(visibleOrderHeaderDiscounts([discount()])).toEqual([discount()]);
	});

	it('omits empty, zero, and non-numeric amounts so formatCurrency is never called with null', () => {
		expect(
			visibleOrderHeaderDiscounts([
				discount({ disc_line: 1, disc_amt: null as unknown as number }),
				discount({ disc_line: 2, disc_amt: undefined as unknown as number }),
				discount({ disc_line: 3, disc_amt: 0 }),
				discount({ disc_line: 4, disc_amt: Number.NaN }),
				discount({ disc_line: 5, disc_amt: 8.5 }),
			]),
		).toEqual([discount({ disc_line: 5, disc_amt: 8.5 })]);
	});

	it('treats a missing discounts array as empty', () => {
		expect(visibleOrderHeaderDiscounts(undefined)).toEqual([]);
		expect(visibleOrderHeaderDiscounts(null)).toEqual([]);
	});
});
