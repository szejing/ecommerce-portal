import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const id = getRouterParam(event, 'id') || '';
		return await signedFetch(event, Routes.PlatformAnnouncements.EmailBlastCancel(id), {
			method: 'POST',
			body: {},
			includeMerchantId: false,
		});
	} catch (err) {
		return err;
	}
});
