import { describe, expect, it } from 'vitest';
import {
	formatOrderAddressMultiline,
	orderAddressGoogleMapsUrl,
	orderAddressToMapsSearchQuery,
} from '../../app/utils/order-customer-address';

const sampleAddress = {
	address1: 'B1-40-5, SOHO SUITES',
	address2: '20, Jalan Perak',
	address3: '',
	city: 'Kuala Lumpur',
	postal_code: '50450',
	state: 'Kuala Lumpur',
	country_code: 'MY',
};

describe('formatOrderAddressMultiline', () => {
	it('builds newline-separated lines plus city row', () => {
		expect(formatOrderAddressMultiline(sampleAddress)).toBe(
			['B1-40-5, SOHO SUITES', '20, Jalan Perak', 'Kuala Lumpur, Kuala Lumpur, 50450, MY'].join('\n'),
		);
	});

	it('returns empty when address undefined', () => {
		expect(formatOrderAddressMultiline(undefined)).toBe('');
	});
});

describe('orderAddressToMapsSearchQuery', () => {
	it('maps CRM fields to comma search query', () => {
		expect(orderAddressToMapsSearchQuery(sampleAddress)).toBe(
			'B1-40-5, SOHO SUITES, 20, Jalan Perak, 50450, Kuala Lumpur, Kuala Lumpur, MY',
		);
	});
});

describe('orderAddressGoogleMapsUrl', () => {
	it('returns encoded Google Maps search URL or null', () => {
		const url = orderAddressGoogleMapsUrl(sampleAddress);
		expect(url).not.toBeNull();
		expect(url).toContain('https://www.google.com/maps/search/');
		expect(url).toContain(encodeURIComponent(orderAddressToMapsSearchQuery(sampleAddress)));
		expect(orderAddressGoogleMapsUrl(undefined)).toBeNull();
	});
});
