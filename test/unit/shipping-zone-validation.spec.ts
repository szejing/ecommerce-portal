import { describe, expect, it } from 'vitest';
import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';
import { CreateShippingZoneValidation, UpdateShippingZoneValidation } from '../../app/utils/schema/ShippingZone/Create/ShippingZoneValidation';

const t = (key: string) => key;

const includeMy = {
	filter_operator: FilterOperator.INCLUDE,
	field: ShippingZoneConditionField.COUNTRY,
	values: ['MY'],
};

const baseValid = {
	code: 'Z1',
	description: '',
	rule: 0,
	is_active: true,
	conditions: [includeMy],
	shipping_method_ids: ['1'],
	method_pricing: {
		'1': { fee: 0, estimated_days: undefined, order_cutoff_time: undefined },
	},
};

describe('ShippingZoneValidation', () => {
	it('CreateShippingZoneValidation accepts include country without state', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse(baseValid);
		expect(r.success).toBe(true);
	});

	it('CreateShippingZoneValidation accepts empty conditions (worldwide)', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({ ...baseValid, conditions: [] });
		expect(r.success).toBe(true);
	});

	it('CreateShippingZoneValidation rejects empty condition values', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({
			...baseValid,
			conditions: [{ ...includeMy, values: [] }],
		});
		expect(r.success).toBe(false);
	});

	it('CreateShippingZoneValidation rejects duplicate operator and field', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({
			...baseValid,
			conditions: [includeMy, { ...includeMy }],
		});
		expect(r.success).toBe(false);
	});

	it('CreateShippingZoneValidation rejects invalid country codes', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({
			...baseValid,
			conditions: [{ ...includeMy, values: ['MYS'] }],
		});
		expect(r.success).toBe(false);
	});

	it('UpdateShippingZoneValidation shares the same rules', () => {
		const schema = UpdateShippingZoneValidation(t);
		const r = schema.safeParse({ ...baseValid, conditions: [] });
		expect(r.success).toBe(true);
	});

	it('CreateShippingZoneValidation accepts HH:mm order cutoff time', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({
			...baseValid,
			method_pricing: {
				'1': { fee: 0, estimated_days: 1, order_cutoff_time: '12:00' },
			},
		});
		expect(r.success).toBe(true);
	});

	it('CreateShippingZoneValidation rejects invalid order cutoff time', () => {
		const schema = CreateShippingZoneValidation(t);
		const r = schema.safeParse({
			...baseValid,
			method_pricing: {
				'1': { fee: 0, estimated_days: 1, order_cutoff_time: '25:00' },
			},
		});
		expect(r.success).toBe(false);
	});
});
