import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const provider = getRouterParam(event, 'provider') ?? '';
		return await signedFetch(event, Routes.OAuth.Disconnect(provider), {
			method: 'POST',
		});
	} catch (err) {
		return err;
	}
});
