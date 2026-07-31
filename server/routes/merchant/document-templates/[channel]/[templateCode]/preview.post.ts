import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	const { channel, templateCode } = getRouterParams(event);
	if (!channel || !templateCode) throw createError({ statusCode: 400, statusMessage: 'Template identity is required' });
	const body = await readBody(event);
	const result = await signedFetch(event, Routes.DocumentTemplates.Preview(channel, templateCode), {
		method: 'POST',
		body,
		...(channel === 'pdf' ? { responseType: 'blob' } : {}),
	});

	if (channel === 'pdf') {
		setHeader(event, 'Content-Type', 'application/pdf');
		setHeader(event, 'Cache-Control', 'no-store');
		setHeader(event, 'X-Content-Type-Options', 'nosniff');
	}

	return result;
});
