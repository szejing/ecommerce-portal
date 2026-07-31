import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';
import { pickDocumentTemplateVersionBody } from '../../body';

export default defineEventHandler(async (event) => {
	const { channel, templateCode } = getRouterParams(event);
	if (!channel || !templateCode) throw createError({ statusCode: 400, statusMessage: 'Template identity is required' });
	const body = pickDocumentTemplateVersionBody(await readBody(event));
	return await signedFetch(event, Routes.DocumentTemplates.Reset(channel, templateCode), {
		method: 'POST',
		body,
	});
});
