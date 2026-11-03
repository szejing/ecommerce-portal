import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		return await signedFetch(event, Routes.PlatformAnnouncements.InAppMany(), {
			method: 'GET',
			includeMerchantId: false,
		});
	} catch (err) {
		return err;
	}
});
