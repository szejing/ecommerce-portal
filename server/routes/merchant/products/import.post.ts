import { generateImageHeaders } from '../../../base_api';
import { Routes } from '#root/server/routes.server';
import { KEY } from 'yeppi-common';
import { PRODUCT_IMPORT_STREAM_ACCEPT, createProductImportUpstreamFetchOptions } from '#root/server/utils/product-import-upstream';

const PRODUCT_IMPORT_ALLOWED_EXTENSIONS = ['.csv', '.xlsx'] as const;
const PRODUCT_IMPORT_UNSUPPORTED_FILE_MESSAGE = 'Only CSV and XLSX product import files are supported';

function assertAllowedProductImportFile(file: File): void {
	const filename = file.name.toLowerCase();
	const hasAllowedExtension = PRODUCT_IMPORT_ALLOWED_EXTENSIONS.some((extension) => filename.endsWith(extension));

	if (!hasAllowedExtension) {
		throw createError({
			statusCode: 400,
			statusMessage: PRODUCT_IMPORT_UNSUPPORTED_FILE_MESSAGE,
		});
	}
}

export default defineEventHandler(async (event) => {
	try {
		const config = useRuntimeConfig(event);
		const formData = await readFormData(event);
		const file = formData.get('file');

		if (!file || !(file instanceof File)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'File is required and must be a valid file',
			});
		}

		assertAllowedProductImportFile(file);
		const templateType = String(formData.get('template_type') || 'wemotoo');

		if (!['wemotoo', 'sitegiant', 'tiktok'].includes(templateType)) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Unsupported product import template type',
			});
		}

		const merchantId = getCookie(event, KEY.X_MERCHANT_ID) || '';
		if (!merchantId) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Merchant ID is required',
			});
		}

		const newFormData = new FormData();
		const blob = new Blob([file], { type: file.type });
		newFormData.append('merchant_id', merchantId);
		newFormData.append('template_type', templateType);
		newFormData.append('file', blob, file.name);

		// Import Progress is streamed as NDJSON, so the upstream body is passed
		// through untouched instead of being buffered and parsed as JSON.
		const upstream = await $fetch.raw(`${Routes.Products.Import()}`, {
			baseURL: String(config.public.baseUrl ?? ''),
			method: 'POST',
			body: newFormData,
			headers: {
				...generateImageHeaders(event, Routes.Products.Import()),
				Accept: PRODUCT_IMPORT_STREAM_ACCEPT,
			},
			responseType: 'stream',
			...createProductImportUpstreamFetchOptions(),
		});

		setResponseStatus(event, upstream.status);
		setResponseHeader(event, 'content-type', upstream.headers.get('content-type') || 'application/x-ndjson');
		setResponseHeader(event, 'cache-control', 'no-cache, no-transform');
		setResponseHeader(event, 'x-accel-buffering', 'no');
		return upstream._data;
	} catch (err) {
		return err;
	}
});
