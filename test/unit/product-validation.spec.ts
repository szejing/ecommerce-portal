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

describe('Fixed combo component validation', () => {
	it('rejects a published fixed combo with fewer than two component units on create', () => {
		const result = CreateProductValidation.safeParse({
			name: 'Meal',
			short_desc: 'Combo',
			status: 'published',
			is_active: true,
			composition: 'fixed_combo',
			combo_components: [{ product_code: 'COKE', quantity: 1 }],
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
		});
		expect(result.success).toBe(false);
	});

	it('allows a draft fixed combo with fewer than two component units', () => {
		const result = CreateProductValidation.safeParse({
			name: 'Meal',
			short_desc: 'Combo',
			status: 'draft',
			is_active: true,
			composition: 'fixed_combo',
			combo_components: [{ product_code: 'COKE', quantity: 1 }],
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
		});
		expect(result.success).toBe(true);
	});

	it('accepts two units as one row qty 2 or two rows of qty 1', () => {
		const oneRow = CreateProductValidation.safeParse({
			name: 'Meal',
			short_desc: 'Combo',
			status: 'published',
			is_active: true,
			composition: 'fixed_combo',
			combo_components: [{ product_code: 'COKE', quantity: 2 }],
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
		});
		const twoRows = CreateProductValidation.safeParse({
			name: 'Meal',
			short_desc: 'Combo',
			status: 'published',
			is_active: true,
			composition: 'fixed_combo',
			combo_components: [
				{ product_code: 'POPCORN', quantity: 1 },
				{ product_code: 'COKE', quantity: 1 },
			],
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
		});
		expect(oneRow.success).toBe(true);
		expect(twoRows.success).toBe(true);
	});
});

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

describe('Product variant SKU validation', () => {
	const variant = (sku: string) => ({
		name: sku || 'S',
		price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
		sku,
	});

	it('rejects duplicate Variant SKUs on update', () => {
		const schema = createUpdateProductValidation(t);
		const result = schema.safeParse({
			...baseUpdate,
			variants: [variant('TEE-S'), variant('TEE-S')],
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.path.join('.') === 'variants.0.sku')).toBe(true);
			expect(result.error.issues.some((issue) => issue.message === 'validation.product.variantSkuDuplicate')).toBe(true);
		}
	});

	it('allows empty Variant SKUs and unique SKUs on update', () => {
		const schema = createUpdateProductValidation(t);
		const result = schema.safeParse({
			...baseUpdate,
			variants: [variant(''), variant(''), variant('TEE-S'), variant('TEE-L')],
		});

		expect(result.success).toBe(true);
	});

	it('rejects duplicate Variant SKUs on create', () => {
		const result = CreateProductValidation.safeParse({
			name: 'Cotton Tee',
			short_desc: 'Soft cotton tee',
			status: 'published',
			is_active: true,
			price_types: [{ currency_code: 'MYR', orig_sell_price: 10 }],
			type_id: 1,
			variants: [variant('TEE-S'), variant('TEE-S')],
		});

		expect(result.success).toBe(false);
	});
});
