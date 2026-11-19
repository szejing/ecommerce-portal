import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	return signedFetch(event, `events/${id}/ticket-types`, { method: 'POST', body: await readBody(event) });
});
