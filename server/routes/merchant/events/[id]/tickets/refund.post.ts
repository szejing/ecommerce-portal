import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	return signedFetch(event, `events/${id}/tickets/refund`, { method: 'POST', body: await readBody(event) });
});
