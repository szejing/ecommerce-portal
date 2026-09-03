import { describe, expect, it } from 'vitest';
import { pickCourierServiceId } from '../../app/utils/courier-booking-last-service';

const quotes = [{ service_id: 'svc-1' }, { service_id: 'svc-2' }, { service_id: 'svc-3' }];

describe('pickCourierServiceId', () => {
	it('returns the remembered service when it is still in the quote list', () => {
		expect(pickCourierServiceId(quotes, 'svc-2')).toBe('svc-2');
	});

	it('falls back to the first quote when the remembered service is missing', () => {
		expect(pickCourierServiceId(quotes, 'svc-gone')).toBe('svc-1');
		expect(pickCourierServiceId(quotes, '  ')).toBe('svc-1');
		expect(pickCourierServiceId(quotes, null)).toBe('svc-1');
	});

	it('returns undefined when there are no quotes', () => {
		expect(pickCourierServiceId([], 'svc-2')).toBeUndefined();
	});
});
