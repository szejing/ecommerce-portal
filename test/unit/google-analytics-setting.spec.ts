import { describe, expect, it } from 'vitest';
import { resolveGoogleAnalyticsSetting } from '../../app/utils/google-analytics-setting';

describe('resolveGoogleAnalyticsSetting', () => {
	it('returns a normalized valid ID', () => {
		expect(resolveGoogleAnalyticsSetting('  g-merchant1  ')).toEqual({
			ok: true,
			value: 'G-MERCHANT1',
		});
	});

	it('returns blank for the remove action', () => {
		expect(resolveGoogleAnalyticsSetting('   ')).toEqual({
			ok: true,
			value: '',
		});
	});

	it('returns the stable translation key for an invalid ID', () => {
		expect(resolveGoogleAnalyticsSetting('UA-12345')).toEqual({
			ok: false,
			errorKey: 'pages.googleAnalytics.invalidMeasurementId',
		});
	});
});
