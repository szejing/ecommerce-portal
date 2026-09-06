import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductModule, { type ProductImportStreamOptions } from '../../app/repository/modules/product/product';
import type { ImportProgress } from '../../app/utils/import-stream';

const originalFetch = globalThis.fetch;

function ndjsonResponse(lines: string[], init?: ResponseInit): Response {
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			// Split mid-line so the client has to buffer a partial chunk.
			const payload = lines.join('\n');
			controller.enqueue(encoder.encode(payload.slice(0, 12)));
			controller.enqueue(encoder.encode(payload.slice(12)));
			controller.close();
		},
	});

	return new Response(body, {
		status: 200,
		headers: { 'content-type': 'application/x-ndjson' },
		...init,
	});
}

const workbook = () => new File(['code,name'], 'products.csv', { type: 'text/csv' });

const importProducts = (options?: ProductImportStreamOptions) =>
	new ProductModule().importProducts(workbook(), 'wemotoo', options);

describe('ProductModule.importProducts', () => {
	beforeEach(() => {
		globalThis.fetch = vi.fn() as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('asks the import proxy for NDJSON and reports Import Progress before the result', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			ndjsonResponse([
				'{"type":"progress","processed":0,"total":null}',
				'{"type":"progress","processed":1,"total":2}',
				'{"type":"result","result":{"total":2,"created":2,"updated":0,"failed":0,"errors":[],"images_attached":1,"image_warnings":[]}}',
			]),
		);

		const progress: ImportProgress[] = [];
		const result = await importProducts({ onProgress: (update) => progress.push(update) });

		const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/products/import');
		expect(init.method).toBe('POST');
		expect((init.headers as Record<string, string>).Accept).toBe('application/x-ndjson');
		expect(init.body).toBeInstanceOf(FormData);
		expect(progress).toEqual([
			{ processed: 0, total: null },
			{ processed: 1, total: 2 },
		]);
		expect(result).toMatchObject({ created: 2, images_attached: 1, stopped: false });
	});

	it('returns the partial summary of a stopped import', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			ndjsonResponse([
				'{"type":"progress","processed":1,"total":9}',
				'{"type":"stopped","processed":1,"total":9,"result":{"total":9,"created":1,"updated":0,"failed":0,"errors":[],"images_attached":0,"image_warnings":[]}}',
			]),
		);

		const result = await importProducts();

		expect(result).toMatchObject({ created: 1, stopped: true });
	});

	it('throws the message carried by an error event', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			ndjsonResponse(['{"type":"progress","processed":1,"total":9}', '{"type":"error","message":"Workbook header is invalid"}']),
		);

		await expect(importProducts()).rejects.toThrow('Workbook header is invalid');
	});

	it('accepts a single JSON summary from a backend that does not stream yet', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			ndjsonResponse(['{"total":3,"created":3,"updated":0,"failed":0,"errors":[],"images_attached":0,"image_warnings":[]}']),
		);

		await expect(importProducts()).resolves.toMatchObject({ created: 3, stopped: false });
	});

	it('surfaces an error the import proxy answered with a 200 body', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(ndjsonResponse(['{"statusCode":400,"message":"Merchant ID is required"}']));

		await expect(importProducts()).rejects.toThrow('Merchant ID is required');
	});

	it('passes the abort signal so staff can stop the import', async () => {
		vi.mocked(globalThis.fetch).mockResolvedValue(
			ndjsonResponse(['{"type":"result","result":{"total":0,"created":0,"updated":0,"failed":0,"errors":[],"images_attached":0,"image_warnings":[]}}']),
		);

		const controller = new AbortController();
		await importProducts({ signal: controller.signal });

		const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
		expect(init.signal).toBe(controller.signal);
	});

	it('rejects an unsupported workbook before opening a request', async () => {
		await expect(new ProductModule().importProducts(new File([''], 'products.pdf'))).rejects.toThrow(/Unsupported product import file format/);
		expect(globalThis.fetch).not.toHaveBeenCalled();
	});
});
