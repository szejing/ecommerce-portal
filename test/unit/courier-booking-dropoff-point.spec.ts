import { describe, expect, it } from 'vitest';
import {
	formatCourierDropoffPointLabel,
	hasCompleteCourierBookingSenderAddress,
} from '../../app/utils/types/courier-booking';

describe('courier booking dropoff point helpers', () => {
	it('formats nearby drop-off point labels for the select', () => {
		expect(
			formatCourierDropoffPointLabel({
				point_id: 'EP-CB0FF',
				name: 'Pejabat Pos Besar Pulau Pinang',
				address_1: 'Leboh Downing',
				postcode: '10670',
				city: 'Pulau Pinang',
				start_time: '08:00:00',
				end_time: '13:00:00',
			}),
		).toBe('Pejabat Pos Besar Pulau Pinang · Leboh Downing, 10670, Pulau Pinang · 08:00–13:00');
	});

	it('requires a complete store address before listing nearby points', () => {
		expect(
			hasCompleteCourierBookingSenderAddress({
				postcode: '50000',
				city: 'Kuala Lumpur',
				state: 'Kuala Lumpur',
				country: 'MY',
			}),
		).toBe(true);
		expect(
			hasCompleteCourierBookingSenderAddress({
				postcode: '',
				city: 'Kuala Lumpur',
				state: 'Kuala Lumpur',
				country: 'MY',
			}),
		).toBe(false);
	});
});
