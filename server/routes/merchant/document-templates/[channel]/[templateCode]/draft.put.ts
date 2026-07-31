import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	const { channel, templateCode } = getRouterParams(event);
	if (!channel || !templateCode) throw createError({ statusCode: 400, statusMessage: 'Template identity is required' });
	const body = await readBody(event);
	return await signedFetch(event, Routes.DocumentTemplates.SaveDraft(channel, templateCode), {
		method: 'PUT',
		body,
	});
});
