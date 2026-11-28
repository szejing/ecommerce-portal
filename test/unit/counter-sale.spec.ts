import { describe, expect, it } from 'vitest';
import { canContinueCounterSale, catalogUnitPrice, counterSaleErrorMessage, counterSaleLineTotal, isCounterSaleMobile } from '../../app/utils/counter-sale';

describe('counter sale screen rules', () => {
	it('requires a line and a 6 to 15 digit mobile before payment', () => {
		expect(canContinueCounterSale(0, '123456')).toBe(false);
		expect(canContinueCounterSale(1, '12345')).toBe(false);
		expect(canContinueCounterSale(1, '123456')).toBe(true);
		expect(isCounterSaleMobile('12 345 6789')).toBe(true);
	});

	it('reads the business message from a failed request', () => {
		expect(counterSaleErrorMessage({ data: { message: 'Sold out' } }, 'Saved nothing')).toBe('Sold out');
		expect(counterSaleErrorMessage({ data: { message: ['Sold out', 'Try again'] } }, 'Saved nothing')).toBe('Sold out Try again');
		expect(counterSaleErrorMessage(new Error('network'), 'Saved nothing')).toBe('Saved nothing');
	});

	it('shows the line total for the quantity', () => {
		expect(counterSaleLineTotal(24, 2)).toBe(48);
		expect(catalogUnitPrice({ orig_sell_price: 30, sale_price: 24 })).toBe(24);
		expect(catalogUnitPrice({ orig_sell_price: 30, sale_price: 30 })).toBe(30);
	});
});
