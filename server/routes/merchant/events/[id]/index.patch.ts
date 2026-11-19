import { Routes } from '#root/server/routes.server';
import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	return signedFetch(event, Routes.Events.Detail(id), { method: 'PATCH', body: await readBody(event) });
});
