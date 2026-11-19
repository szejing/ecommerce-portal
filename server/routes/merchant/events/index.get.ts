import { Routes } from '#root/server/routes.server';
import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	return signedFetch(event, Routes.Events.List(), { method: 'GET', query: getQuery(event) });
});
