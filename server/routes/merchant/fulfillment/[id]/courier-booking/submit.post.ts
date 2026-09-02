import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const id = getRouterParam(event, 'id');
		if (!id) throw createError({ statusCode: 400, statusMessage: 'Fulfillment id is required' });
		const body = await readBody(event);

		return await signedFetch(event, Routes.Fulfillment.CourierBooking.Submit(id), {
			method: 'POST',
			body,
		});
	} catch (err) {
		return err;
	}
});
