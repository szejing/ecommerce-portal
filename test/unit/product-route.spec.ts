import { describe, expect, it } from 'bun:test';
import { LineType } from 'yeppi-common';
import { orderItemDetailPath, productDetailPath, productRouteSegment } from '../../app/utils/product-route';

describe('product route helpers', () => {
	it('uses slug for product detail paths', () => {
		expect(productRouteSegment({ code: 'PROD-1', slug: 'premium-shirt' })).toBe('premium-shirt');
		expect(productDetailPath({ code: 'PROD-1', slug: 'premium-shirt' })).toBe('/products/premium-shirt');
	});

	it('falls back to product code when slug is missing', () => {
		expect(productRouteSegment({ code: 'PROD-1' })).toBe('PROD-1');
		expect(productDetailPath({ code: 'PROD-1' })).toBe('/products/PROD-1');
	});

	it('opens fixed combos in their dedicated configuration route', () => {
		expect(productDetailPath({ code: 'MEAL', slug: 'meal-a', composition: 'fixed_combo' } as Parameters<typeof productDetailPath>[0])).toBe('/products/combos/meal-a');
	});

	it('maps order combo headers to combo detail and other lines to product detail', () => {
		expect(orderItemDetailPath({ prod_code: 'MEAL', line_type: LineType.COMBO_HEADER })).toBe('/products/combos/MEAL');
		expect(orderItemDetailPath({ prod_code: 'DRINK', line_type: LineType.COMBO_ITEM })).toBe('/products/DRINK');
		expect(orderItemDetailPath({ prod_code: 'SHIRT' })).toBe('/products/SHIRT');
		expect(orderItemDetailPath({ prod_code: '  ' })).toBeNull();
	});
});
