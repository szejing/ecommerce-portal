import { describe, expect, it } from 'vitest';
import { DiscountType } from 'yeppi-common';
import { formatDiscountDiscValue, getDiscountTypeBadgeColor } from '../../app/utils/discount-rule-display';

describe('getDiscountTypeBadgeColor', () => {
	it('maps percentage to info', () => {
		expect(getDiscountTypeBadgeColor(DiscountType.PERCENTAGE)).toBe('info');
	});

	it('maps fixed to primary', () => {
		expect(getDiscountTypeBadgeColor(DiscountType.FIXED)).toBe('primary');
	});

	it('maps free shipping to success', () => {
		expect(getDiscountTypeBadgeColor(DiscountType.FREE_SHIPPING)).toBe('success');
	});

	it('falls back to info when type is missing', () => {
		expect(getDiscountTypeBadgeColor(undefined)).toBe('info');
	});
});

describe('formatDiscountDiscValue', () => {
	it('formats percentage', () => {
		expect(formatDiscountDiscValue(DiscountType.PERCENTAGE, 12.5)).toBe('12.5%');
	});

	it('formats fixed with MYR', () => {
		expect(formatDiscountDiscValue(DiscountType.FIXED, 10)).toMatch(/10/);
	});

	it('stringifies other rule types', () => {
		expect(formatDiscountDiscValue(DiscountType.FREE_SHIPPING, 0)).toBe('0');
	});
});
