import { signedFetch } from '#root/server/base_api';

export default defineEventHandler(async (event) => {
	return signedFetch(event, `events`, { method: 'POST', body: await readBody(event) });
});
