import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
	PRODUCT_IMPORT_STREAM_ACCEPT,
	PRODUCT_IMPORT_UPSTREAM_TIMEOUT_MS,
	createProductImportUpstreamFetchOptions,
} from '../../server/utils/product-import-upstream';

describe('createProductImportUpstreamFetchOptions', () => {
	it('raises ofetch timeout past the 5-minute default without a custom undici Agent', () => {
		const options = createProductImportUpstreamFetchOptions();

		expect(PRODUCT_IMPORT_UPSTREAM_TIMEOUT_MS).toBeGreaterThan(300_000);
		expect(options.timeout).toBe(PRODUCT_IMPORT_UPSTREAM_TIMEOUT_MS);
		expect(options.timeout).toBe(2 * 60 * 60 * 1000);
		// npm undici@8 Agent + Node built-in fetch → fetch failed / invalid onRequestStart
		expect(options).not.toHaveProperty('dispatcher');
	});
});

describe('product import proxy route', () => {
	it('passes the upstream NDJSON body through instead of parsing it', async () => {
		const handler = await readFile(
			new URL('../../server/routes/merchant/products/import.post.ts', import.meta.url),
			'utf8',
		);

		expect(PRODUCT_IMPORT_STREAM_ACCEPT).toBe('application/x-ndjson');
		expect(handler).toContain('$fetch.raw');
		expect(handler).toMatch(/responseType: 'stream'/);
		expect(handler).toContain('Accept: PRODUCT_IMPORT_STREAM_ACCEPT');
		expect(handler).toContain('createProductImportUpstreamFetchOptions()');
		expect(handler).toContain('return upstream._data;');
		expect(handler).not.toMatch(/from ['"]undici['"]/);
	});
});
