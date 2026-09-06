/**
 * TikTok / large catalog imports can run well past ofetch’s default timeout
 * while products and external images are ingested sync.
 *
 * Do not pass a custom `undici` Agent as `dispatcher` here. Nitro/ofetch uses
 * Node’s built-in fetch (undici 6.x on Node 22); the npm `undici@8` Agent
 * hoisted via @nuxt/fonts is ABI-incompatible and fails with
 * `invalid onRequestStart method` → `<no response> fetch failed`.
 * Nest flushes Import Progress headers immediately and writes NDJSON often
 * enough that the built-in body idle timeout stays alive.
 */
export const PRODUCT_IMPORT_UPSTREAM_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export const PRODUCT_IMPORT_STREAM_ACCEPT = 'application/x-ndjson';

export function createProductImportUpstreamFetchOptions(): {
	timeout: number;
} {
	return {
		timeout: PRODUCT_IMPORT_UPSTREAM_TIMEOUT_MS,
	};
}
