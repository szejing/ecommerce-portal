import { describe, expect, it } from 'vitest';
import { hashBody } from 'yeppi-common';
import { pathForSignature, rawBodyForSignature, upstreamFetchBody } from '../../server/base_api';

describe('rawBodyForSignature (matches backend SignatureGuard)', () => {
	it('uses empty body hash for DELETE even when a JSON body is sent', () => {
		const body = { merchant_id: 'M1', user: { id: 'u1' } };
		expect(rawBodyForSignature('DELETE', body)).toBeUndefined();
		expect(hashBody(rawBodyForSignature('DELETE', body) ?? undefined)).toBe(hashBody(undefined));
	});

	it('hashes JSON body for PATCH', () => {
		const body = { merchant_id: 'M1' };
		expect(rawBodyForSignature('PATCH', body)).toBe(JSON.stringify(body));
	});
});

describe('upstreamFetchBody (matches wire bytes used in X-Signature)', () => {
	it('stringifies POST bodies once so hash matches Nest req.rawBody', () => {
		const body = { merchant_id: 'M1', email_address: 'a@b.com', password: 'x' };
		const serialized = upstreamFetchBody('POST', body);
		expect(serialized).toBe(JSON.stringify(body));
		expect(hashBody(rawBodyForSignature('POST', serialized) ?? undefined)).toBe(hashBody(serialized));
	});

	it('does not stringify DELETE bodies (guard ignores body bytes)', () => {
		const body = { merchant_id: 'M1', user: { id: 'u1' } };
		expect(upstreamFetchBody('DELETE', body)).toBe(body);
	});
});

describe('pathForSignature (signed upstream path)', () => {
	it('prefixes /api/ and normalizes segment slashes (matches Nest originalUrl, not rewritten req.url)', () => {
		expect(pathForSignature('settings/')).toMatch(/^\/api\/settings/);
		expect(pathForSignature('/merchant/settings/')).toMatch(/^\/api\/settings/);
	});

	it('includes sorted query in canonical string when query is provided', () => {
		const a = pathForSignature('settings/', { $top: 10, $skip: 0 });
		const b = pathForSignature('settings/', { $skip: 0, $top: 10 });
		expect(a).toBe(b);
	});

	it('serializes array query values as repeated keys to match upstream URL', () => {
		const signedPath = pathForSignature('shipping-methods/id-1', {
			defaultRelations: ['zones', 'zones.shipping_zone'],
		});
		expect(signedPath).toBe('/api/shipping-methods/id-1?defaultRelations=zones&defaultRelations=zones.shipping_zone');
	});
});

describe('Platform Shell x-platform resolution (APP_PLATFORM)', () => {
	it('maps yeppi env to yeppi platform for signed API headers', async () => {
		const { resolvePortalAppPlatform } = await import('../../app/utils/platform-shell');
		expect(resolvePortalAppPlatform('yeppi')).toBe('yeppi');
		expect(resolvePortalAppPlatform('wemotoo')).toBe('wemotoo');
	});
});
