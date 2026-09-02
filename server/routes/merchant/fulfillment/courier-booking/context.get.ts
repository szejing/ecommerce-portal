import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const query = getQuery(event);
		return await signedFetch(event, Routes.Fulfillment.CourierBooking.Context(), {
			method: 'GET',
			query,
		});
	} catch (err) {
		return err;
	}
});
