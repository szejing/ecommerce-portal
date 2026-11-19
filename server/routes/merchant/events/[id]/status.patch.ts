import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	return signedFetch(event, `events/${id}/status`, { method: 'PATCH', body: await readBody(event) });
});
