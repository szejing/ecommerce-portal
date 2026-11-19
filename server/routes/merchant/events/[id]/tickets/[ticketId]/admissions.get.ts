import { Routes } from '#root/server/routes.server';
import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	const id = encodeURIComponent(getRouterParam(event, 'id') || '');
	const ticketId = encodeURIComponent(getRouterParam(event, 'ticketId') || '');
	return signedFetch(event, Routes.Events.AdmissionHistory(id, ticketId), { method: 'GET', query: getQuery(event) });
});
