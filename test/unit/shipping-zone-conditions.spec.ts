import { describe, expect, it } from 'vitest';
import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';
import {
	defaultShippingZoneConditions,
	hasIncludeCountry,
	nextAvailableCondition,
	splitPostcodeText,
	zoneRegionSummary,
} from '../../app/utils/shipping-zone-conditions';

describe('shipping-zone-conditions', () => {
	it('prefills include country MY', () => {
		expect(defaultShippingZoneConditions()).toEqual([
			{
				filter_operator: FilterOperator.INCLUDE,
				field: ShippingZoneConditionField.COUNTRY,
				values: ['MY'],
			},
		]);
		expect(hasIncludeCountry(defaultShippingZoneConditions())).toBe(true);
		expect(hasIncludeCountry([])).toBe(false);
	});

	it('suggests the next unused operator and field pair', () => {
		const next = nextAvailableCondition(defaultShippingZoneConditions());
		expect(next).toEqual({
			filter_operator: FilterOperator.INCLUDE,
			field: ShippingZoneConditionField.STATE,
			values: [],
		});
	});

	it('splits postcodes and keeps prefix tokens', () => {
		expect(splitPostcodeText('09000, 47*\n47500')).toEqual(['09000', '47*', '47500']);
	});

	it('summarizes include country separately from other rows', () => {
		const summary = zoneRegionSummary([
			...defaultShippingZoneConditions(),
			{
				filter_operator: FilterOperator.EXCLUDE,
				field: ShippingZoneConditionField.STATE,
				values: ['Sabah', 'Sarawak'],
			},
		]);
		expect(summary.country).toBe('MY');
		expect(summary.details).toContain('exclude');
		expect(summary.details).toContain('Sabah, Sarawak');
	});
});
