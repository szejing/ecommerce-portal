import HttpFactory from '~/repository/factory';
import MerchantRoutes from '~/repository/routes.client';
import type { CreateProductReq } from './models/request/create-product.req';
import type { ProductReq } from './models/request/product.req';
import type { UpdateProductReq } from './models/request/update-product.req';
import type { CreateProductResp } from './models/response/create-product.resp';
import type { ProductResp } from './models/response/product.resp';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { BaseODataResp } from '~/repository/base/base.resp';
import type { Product } from '~/utils/types/product';
import { parseImportStreamEvent, splitNdjsonLines, type ImportProgress } from '~/utils/import-stream';

const PRODUCT_IMPORT_ALLOWED_EXTENSIONS = ['.csv', '.xlsx'] as const;

export const PRODUCT_IMPORT_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const PRODUCT_IMPORT_STREAM_ACCEPT = 'application/x-ndjson';
export const PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE = 'Unsupported product import file format. Allowed: CSV, XLSX';
export type ProductImportTemplateType = 'wemotoo' | 'sitegiant' | 'tiktok';

export type ProductImportResp = {
	total: number;
	created: number;
	updated: number;
	failed: number;
	errors: Array<{
		row: number;
		code?: string;
		message: string;
	}>;
	images_attached: number;
	image_warnings: Array<{
		row: number;
		code?: string;
		message: string;
	}>;
};

export type ProductImportStreamResult = ProductImportResp & { stopped: boolean };

export type ProductImportStreamOptions = {
	signal?: AbortSignal;
	onProgress?: (progress: ImportProgress) => void;
};

const EMPTY_PRODUCT_IMPORT_RESULT: ProductImportResp = {
	total: 0,
	created: 0,
	updated: 0,
	failed: 0,
	errors: [],
	images_attached: 0,
	image_warnings: [],
};

export function isAllowedProductImportFile(file: File): boolean {
	const filename = file.name.toLowerCase();
	return PRODUCT_IMPORT_ALLOWED_EXTENSIONS.some((extension) => filename.endsWith(extension));
}

function assertAllowedProductImportFormat(file: File): void {
	if (!isAllowedProductImportFile(file)) {
		throw new Error(PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE);
	}
}

function toProductImportResult(result: unknown, stopped: boolean): ProductImportStreamResult {
	const payload = (result && typeof result === 'object' ? result : {}) as Partial<ProductImportResp>;
	return {
		...EMPTY_PRODUCT_IMPORT_RESULT,
		...payload,
		errors: payload.errors ?? [],
		image_warnings: payload.image_warnings ?? [],
		stopped,
	};
}

/** The import proxy answers 200 with the serialized error, so a summary-less payload is a failure. */
function resolveProductImportFailureMessage(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') return undefined;

	const record = payload as Record<string, unknown>;
	if (typeof record.total === 'number') return undefined;

	const message = record.message ?? record.statusMessage;
	return typeof message === 'string' && message.trim() ? message : undefined;
}

async function readProductImportErrorMessage(response: Response): Promise<string> {
	try {
		const payload = (await response.json()) as { message?: string; statusMessage?: string };
		const message = payload?.message ?? payload?.statusMessage;
		if (typeof message === 'string' && message.trim()) return message;
	} catch {
		// Non-JSON error bodies fall back to the status.
	}

	return `Product import failed with status ${response.status}`;
}

async function consumeProductImportStream(
	body: ReadableStream<Uint8Array>,
	onProgress?: (progress: ImportProgress) => void,
): Promise<ProductImportStreamResult> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let pending = '';
	let raw = '';
	let outcome: ProductImportStreamResult | undefined;

	const consumeLine = (line: string) => {
		const event = parseImportStreamEvent(line);
		if (!event || outcome) return;

		switch (event.type) {
			case 'progress':
				onProgress?.({ processed: event.processed, total: event.total });
				break;
			case 'result':
				outcome = toProductImportResult(event.result, false);
				break;
			case 'stopped':
				onProgress?.({ processed: event.processed, total: event.total });
				outcome = toProductImportResult(event.result, true);
				break;
			case 'error':
				throw new Error(event.message);
		}
	};

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			raw += chunk;
			const { lines, rest } = splitNdjsonLines(pending + chunk);
			pending = rest;
			for (const line of lines) consumeLine(line);
		}

		const tail = decoder.decode();
		raw += tail;
		pending += tail;
		if (pending.trim()) consumeLine(pending);
	} finally {
		reader.releaseLock();
	}

	if (outcome) return outcome;

	// A backend that has not adopted NDJSON yet answers with one JSON summary.
	let payload: unknown;
	try {
		payload = JSON.parse(raw.trim());
	} catch {
		throw new Error('Product import ended without a result');
	}

	const failureMessage = resolveProductImportFailureMessage(payload);
	if (failureMessage) throw new Error(failureMessage);

	return toProductImportResult(payload, false);
}

class ProductModule extends HttpFactory {
	private RESOURCE = MerchantRoutes.Products;

	async getMany(query: BaseODataReq): Promise<BaseODataResp<Product>> {
		return await this.call<BaseODataResp<Product>>({
			method: 'GET',
			url: `${this.RESOURCE.Many()}`,
			query,
		});
	}

	async getSingle(code: string): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'GET',
			url: `${this.RESOURCE.Single(code)}`,
		});
	}

	async getSingleBySlug(slug: string): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'GET',
			url: `${this.RESOURCE.BySlug(slug)}`,
		});
	}

	async create(product: CreateProductReq): Promise<CreateProductResp> {
		return await this.call<CreateProductResp>({
			method: 'POST',
			url: `${this.RESOURCE.Create()}`,
			body: product,
		});
	}

	async update(code: string, product: UpdateProductReq): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'PATCH',
			url: `${this.RESOURCE.Update(code)}`,
			body: product,
		});
	}

	async delete(product: ProductReq): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'DELETE',
			url: `${this.RESOURCE.Delete(product.code)}`,
		});
	}

	async deleteVariant(code: string, variant_code: string): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'DELETE',
			url: `${this.RESOURCE.DeleteVariant(code, variant_code)}`,
		});
	}

	async restore(product: ProductReq): Promise<ProductResp> {
		return await this.call<ProductResp>({
			method: 'PATCH',
			url: `${this.RESOURCE.Restore(product.code)}`,
		});
	}

	async importProducts(
		file: File,
		templateType: ProductImportTemplateType = 'wemotoo',
		options: ProductImportStreamOptions = {},
	): Promise<ProductImportStreamResult> {
		assertAllowedProductImportFormat(file);

		const formData = new FormData();
		formData.append('file', file);
		formData.append('template_type', templateType);

		// Native fetch, not the HttpFactory, because Import Progress needs the
		// response body as a stream rather than a parsed payload.
		const response = await fetch(`${this.RESOURCE.Import()}`, {
			method: 'POST',
			body: formData,
			headers: { Accept: PRODUCT_IMPORT_STREAM_ACCEPT },
			signal: options.signal,
		});

		if (!response.ok) {
			throw new Error(await readProductImportErrorMessage(response));
		}

		if (!response.body) {
			throw new Error('Product import stream is unavailable');
		}

		return await consumeProductImportStream(response.body, options.onProgress);
	}

	async downloadImportTemplate(): Promise<Blob> {
		return await this.call<Blob>({
			method: 'GET',
			url: `${this.RESOURCE.ImportTemplate()}`,
			fetchOptions: {
				responseType: 'blob',
			},
		});
	}
}

export default ProductModule;
