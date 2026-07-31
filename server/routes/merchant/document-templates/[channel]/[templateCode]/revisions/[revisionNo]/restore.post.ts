import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';
import { pickDocumentTemplateVersionBody } from '../../../../body';

export default defineEventHandler(async (event) => {
	const { channel, templateCode, revisionNo } = getRouterParams(event);
	if (!channel || !templateCode || !revisionNo) throw createError({ statusCode: 400, statusMessage: 'Template revision identity is required' });
	const body = pickDocumentTemplateVersionBody(await readBody(event));
	return await signedFetch(event, Routes.DocumentTemplates.Restore(channel, templateCode, revisionNo), {
		method: 'POST',
		body,
	});
});
