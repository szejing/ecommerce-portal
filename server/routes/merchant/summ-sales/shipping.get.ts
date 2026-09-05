import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const query = getQuery(event);
		return await signedFetch(event, Routes.SummSales.Shipping(), {
			method: 'GET',
			query,
		});
	} catch (err) {
		return err;
	}
});
