import { beforeEach, describe, expect, it } from 'bun:test';
import { ApiErrorModel } from '~/utils/types/api-error-model';
import HttpFactory from './factory';
import { resetFetchMock } from '../../test/repository-test-setup';

/** `$fetch` is typed as ofetch `$Fetch` (callable + raw/create). Test doubles only implement the call signature. */
function setMockFetch(
	impl: (request: string, options?: Record<string, unknown>) => Promise<unknown>,
): void {
	(globalThis as unknown as { $fetch: typeof $fetch }).$fetch = impl as unknown as typeof $fetch;
}

beforeEach(() => {
	resetFetchMock();
});

describe('HttpFactory.call', () => {
	it('returns JSON from $fetch on success', async () => {
		setMockFetch(async () => ({ ok: true }));
		const http = new HttpFactory();
		const result = await http.call<{ ok: boolean }>({
			method: 'GET',
			url: 'https://example.test/api',
		});
		expect(result).toEqual({ ok: true });
	});

	it('sets application/json Content-Type for non-FormData bodies', async () => {
		const seen: Record<string, unknown>[] = [];
		setMockFetch(async (_url, opts) => {
			seen.push(opts ?? {});
			return {};
		});

		const http = new HttpFactory();
		await http.call({
			method: 'POST',
			url: 'https://example.test/json',
			body: { a: 1 },
		});

		expect((seen[0]!.headers as Record<string, string>)['Content-Type']).toBe('application/json');
	});

	it('omits Content-Type for FormData so the runtime can set multipart boundary', async () => {
		const seen: Record<string, unknown>[] = [];
		setMockFetch(async (_url, opts) => {
			seen.push(opts ?? {});
			return {};
		});

		const formData = new FormData();
		formData.append('file', new File(['x'], 'a.jpg', { type: 'image/jpeg' }));

		const http = new HttpFactory();
		await http.call({
			method: 'POST',
			url: 'https://example.test/upload',
			body: formData,
		});

		const headers = seen[0]!.headers as Record<string, string>;
		expect(headers['Content-Type']).toBeUndefined();
		expect(headers['content-type']).toBeUndefined();
	});

	it('strips Content-Type even when FormData callers pass application/json', async () => {
		const seen: Record<string, unknown>[] = [];
		setMockFetch(async (_url, opts) => {
			seen.push(opts ?? {});
			return {};
		});

		const http = new HttpFactory();
		await http.call({
			method: 'POST',
			url: 'https://example.test/upload',
			body: new FormData(),
			headers: { 'Content-Type': 'application/json' },
		});

		expect((seen[0]!.headers as Record<string, string>)['Content-Type']).toBeUndefined();
	});

	it('rethrows API error payload when error.data.data.error.message is present', async () => {
		const apiErr = { message: 'Invalid credentials', response_code: 401 };
		setMockFetch(async () => {
			throw { data: { data: { error: apiErr } } };
		});

		const http = new HttpFactory();
		await expect(
			http.call({
				method: 'POST',
				url: 'https://example.test/login',
				body: {},
			}),
		).rejects.toEqual(apiErr);
	});

	it('throws ApiErrorModel when $fetch fails without structured API error', async () => {
		setMockFetch(async () => {
			throw new Error('network');
		});

		const http = new HttpFactory();
		const err = await http
			.call({
				method: 'GET',
				url: 'https://example.test/x',
			})
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiErrorModel);
		expect((err as ApiErrorModel).message).toBe('Internal Server Error');
		expect((err as ApiErrorModel).response_code).toBe(500);
	});
});
