import { CourierHandover, InputType } from 'yeppi-common';
import { describe, expect, it } from 'vitest';
import { getCourierHandoverItems } from '../../app/utils/options/courier-handover';

describe('courier handover setting options', () => {
	it('returns pickup and drop-off for the CourierHandover data source', () => {
		expect(getCourierHandoverItems('CourierHandover')).toEqual([
			{ value: CourierHandover.PICKUP, label: 'Pickup' },
			{ value: CourierHandover.DROP_OFF, label: 'Drop-off' },
		]);
		// Segment/provider name is not the SELECT data_source (see easyparcel_settings.sql)
		expect(getCourierHandoverItems('EasyParcel')).toEqual([]);
		expect(getCourierHandoverItems('OrderCompletionValidation')).toEqual([]);
		expect(InputType.OAUTH).toBe(8);
	});
});
