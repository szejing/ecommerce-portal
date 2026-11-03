import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		return await signedFetch(event, Routes.PlatformAuth.Logout(), {
			method: 'POST',
			body: {},
			includeMerchantId: false,
		});
	} catch (err) {
		return err;
	}
});
