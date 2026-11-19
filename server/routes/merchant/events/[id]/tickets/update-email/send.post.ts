import { Routes } from '#root/server/routes.server';
import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	return signedFetch(event, Routes.Events.EmailSend(id), { method: 'POST', body: await readBody(event) });
});
