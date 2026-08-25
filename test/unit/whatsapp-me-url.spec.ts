import { describe, expect, it } from 'vitest';
import { buildWhatsAppMeUrl } from '../../app/utils/whatsapp-me-url';

describe('buildWhatsAppMeUrl', () => {
	it('builds a wa.me URL from dial code and phone number digits', () => {
		expect(buildWhatsAppMeUrl('+60', '12-345 6789')).toBe('https://wa.me/60123456789');
	});

	it('strips a single trunk zero from phone digits when dial code is present', () => {
		expect(buildWhatsAppMeUrl('+60', '0123456789')).toBe('https://wa.me/60123456789');
	});

	it('returns null when the phone details do not contain enough digits', () => {
		expect(buildWhatsAppMeUrl('+60', null)).toBeNull();
		expect(buildWhatsAppMeUrl(null, '123')).toBeNull();
	});
});
