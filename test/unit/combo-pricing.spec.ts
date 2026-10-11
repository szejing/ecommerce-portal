import { describe, expect, it } from 'vitest';
import {
	computeComboPriceComparison,
	resolveComponentUnitPrice,
	totalComboComponentUnits,
} from '../../app/utils/combo-pricing';

describe('combo-pricing', () => {
	it('Popcorn RM8 + Coke RM4, combo RM10 → reference RM12, savings RM2', () => {
		const comparison = computeComboPriceComparison(
			[
				{ unitPrice: 8, quantity: 1, currencyCode: 'MYR' },
				{ unitPrice: 4, quantity: 1, currencyCode: 'MYR' },
			],
			10,
			'MYR',
		);
		expect(comparison).toMatchObject({
			referenceTotal: 12,
			savings: 2,
			showSavings: true,
			comboAtOrAboveReference: false,
		});
	});

	it('keeps combo at RM10 when Coke unit price becomes RM5 and updates reference to RM13', () => {
		const comparison = computeComboPriceComparison(
			[
				{ unitPrice: 8, quantity: 1, currencyCode: 'MYR' },
				{ unitPrice: 5, quantity: 1, currencyCode: 'MYR' },
			],
			10,
			'MYR',
		);
		expect(comparison.referenceTotal).toBe(13);
		expect(comparison.savings).toBe(3);
		expect(comparison.showSavings).toBe(true);
	});

	it('hides savings and flags notice when combo price is at or above reference', () => {
		const equal = computeComboPriceComparison([{ unitPrice: 8, quantity: 1 }, { unitPrice: 4, quantity: 1 }], 12);
		expect(equal.showSavings).toBe(false);
		expect(equal.comboAtOrAboveReference).toBe(true);
		expect(equal.savings).toBe(0);

		const above = computeComboPriceComparison([{ unitPrice: 8, quantity: 1 }, { unitPrice: 4, quantity: 1 }], 15);
		expect(above.showSavings).toBe(false);
		expect(above.comboAtOrAboveReference).toBe(true);
	});

	it('suppresses comparison when any unit price is unresolved or currency mismatches', () => {
		expect(computeComboPriceComparison([{ unitPrice: null, quantity: 1 }, { unitPrice: 4, quantity: 1 }], 10).referenceTotal).toBeNull();
		expect(
			computeComboPriceComparison(
				[
					{ unitPrice: 8, quantity: 1, currencyCode: 'MYR' },
					{ unitPrice: 4, quantity: 1, currencyCode: 'USD' },
				],
				10,
				'MYR',
			).referenceTotal,
		).toBeNull();
	});

	it('prefers sale_price over orig_sell_price when sale is positive', () => {
		expect(resolveComponentUnitPrice({ orig_sell_price: 8, sale_price: 6 })).toBe(6);
		expect(resolveComponentUnitPrice({ orig_sell_price: 8, sale_price: 0 })).toBe(8);
		expect(resolveComponentUnitPrice({ orig_sell_price: 8, sale_price: null })).toBe(8);
		expect(resolveComponentUnitPrice(null)).toBeNull();
	});

	it('counts total component units for the ≥2 publish rule', () => {
		expect(totalComboComponentUnits([{ quantity: 1 }, { quantity: 1 }])).toBe(2);
		expect(totalComboComponentUnits([{ quantity: 2 }])).toBe(2);
		expect(totalComboComponentUnits([{ quantity: 1 }])).toBe(1);
		expect(totalComboComponentUnits([])).toBe(0);
	});
});
