import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';
import { pickDocumentTemplatePublishBody } from '../../body';

export default defineEventHandler(async (event) => {
	const { channel, templateCode } = getRouterParams(event);
	if (!channel || !templateCode) throw createError({ statusCode: 400, statusMessage: 'Template identity is required' });
	const body = pickDocumentTemplatePublishBody(await readBody(event));
	return await signedFetch(event, Routes.DocumentTemplates.Publish(channel, templateCode), {
		method: 'POST',
		body,
	});
});
