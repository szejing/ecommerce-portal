import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';
import { pickDocumentTemplatePreviewBody } from '../../body';

type RawPreviewResponse = {
	status: number;
	ok: boolean;
	headers: Headers;
	_data: Blob;
};

async function previewError(response: RawPreviewResponse) {
	let error: Record<string, unknown> | undefined;
	if (response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
		try {
			const payload = JSON.parse(await response._data.text()) as { error?: Record<string, unknown> };
			error = payload.error;
		} catch {
			// Do not expose malformed upstream response bodies.
		}
	}
	const statusCode = response.status || 502;
	throw createError({
		statusCode,
		statusMessage: typeof error?.message === 'string' ? error.message : 'Document template preview failed',
		data: {
			error: error ?? {
				code: statusCode,
				statusCode,
				message: 'Document template preview failed',
			},
		},
	});
}

export default defineEventHandler(async (event) => {
	const { channel, templateCode } = getRouterParams(event);
	if (!channel || !templateCode) throw createError({ statusCode: 400, statusMessage: 'Template identity is required' });
	const body = pickDocumentTemplatePreviewBody(await readBody(event));
	if (channel !== 'pdf') {
		return await signedFetch(event, Routes.DocumentTemplates.Preview(channel, templateCode), {
			method: 'POST',
			body,
		});
	}

	const result = await signedFetch(event, Routes.DocumentTemplates.Preview(channel, templateCode), {
		method: 'POST',
		body,
		responseType: 'blob',
		raw: true,
		ignoreResponseError: true,
	}) as RawPreviewResponse;
	if (!result.ok) await previewError(result);
	if (!result.headers.get('content-type')?.toLowerCase().startsWith('application/pdf') || !(result._data instanceof Blob)) {
		throw createError({ statusCode: 502, statusMessage: 'Document template preview did not return a PDF' });
	}

	setHeader(event, 'Content-Type', 'application/pdf');
	setHeader(event, 'Cache-Control', 'no-store');
	setHeader(event, 'X-Content-Type-Options', 'nosniff');
	return result._data;
});
