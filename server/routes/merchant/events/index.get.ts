import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	return signedFetch(event, `events`, { method: 'GET', query: getQuery(event) });
});
