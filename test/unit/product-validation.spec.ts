import { describe, expect, it } from 'vitest';
import { PRODUCT_SHORT_DESC_MAX } from 'yeppi-common';
import { CreateProductValidation } from '../../app/utils/schema/Product/Create/ProductValidation';
import { createUpdateProductValidation } from '../../app/utils/schema/Product/Update/ProductValidation';

const t = (key: string) => key;

const baseUpdate = {
	code: 'SKU1',
	name: 'Cotton Tee',
	short_desc: 'Soft cotton tee',
	status: 'published',
	is_active: true,
	price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
	type_id: 1,
};

describe('Product description validation', () => {
	it('rejects a Product Short Description longer than 250 characters on update', () => {
		const schema = createUpdateProductValidation(t);
		const result = schema.safeParse({
			...baseUpdate,
			short_desc: 'x'.repeat(PRODUCT_SHORT_DESC_MAX + 1),
		});

		expect(result.success).toBe(false);
	});

	it('accepts a Product Short Description at the 250 character cap on create', () => {
		const result = CreateProductValidation.safeParse({
			name: 'Cotton Tee',
			short_desc: 'a'.repeat(PRODUCT_SHORT_DESC_MAX),
			status: 'published',
			is_active: true,
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
		});

		expect(result.success).toBe(true);
	});
});
