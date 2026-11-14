import { describe, expect, it } from 'vitest';
import { ICONS } from '../../app/utils/icons';
import { productTypeFilterIcon, productTypeFilterLabel } from '../../app/utils/product-type-label';

const t = (key: string) => key;

describe('productTypeFilterLabel', () => {
	it('maps known product kinds to i18n keys', () => {
		expect(productTypeFilterLabel('item', t)).toBe('components.filter.productTypeProducts');
		expect(productTypeFilterLabel('service', t)).toBe('components.filter.productTypeServices');
		expect(productTypeFilterLabel('event', t)).toBe('components.filter.productTypeEvent');
	});

	it('falls back to the raw value for unknown kinds', () => {
		expect(productTypeFilterLabel('custom', t)).toBe('custom');
	});
});

describe('productTypeFilterIcon', () => {
	it('maps known product kinds to icons', () => {
		expect(productTypeFilterIcon('item')).toBe(ICONS.CUBE);
		expect(productTypeFilterIcon('service')).toBe('i-heroicons-wrench-screwdriver');
		expect(productTypeFilterIcon('event')).toBe(ICONS.CALENDAR);
		expect(productTypeFilterIcon('other')).toBe(ICONS.TAG);
	});
});
