import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	const body = await readBody(event);
	return signedFetch(event, Routes.Orders.CounterSale(), {
		method: 'POST',
		body,
	});
});
