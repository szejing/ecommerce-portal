import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	const typeId = encodeURIComponent(getRouterParam(event, 'typeId') || '');
	return signedFetch(event, `events/${id}/ticket-types/${typeId}`, { method: 'PATCH', body: await readBody(event) });
});
