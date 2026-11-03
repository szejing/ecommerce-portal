import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const body = await readBody(event);
		return await signedFetch(event, Routes.PlatformAnnouncements.InAppMany(), {
			method: 'POST',
			body,
			includeMerchantId: false,
		});
	} catch (err) {
		return err;
	}
});
