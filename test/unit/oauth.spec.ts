import { describe, expect, it } from 'vitest';
import { buildOAuthCallbackUri } from '../../server/utils/oauth';

describe('buildOAuthCallbackUri', () => {
	it('appends the provider OAuth callback path to the CRM origin', () => {
		expect(buildOAuthCallbackUri('http://localhost:3000', 'easyparcel')).toBe(
			'http://localhost:3000/merchant/oauth/easyparcel/callback',
		);
		expect(buildOAuthCallbackUri('https://portal.yeppi.my/', 'easyparcel')).toBe(
			'https://portal.yeppi.my/merchant/oauth/easyparcel/callback',
		);
	});
});
