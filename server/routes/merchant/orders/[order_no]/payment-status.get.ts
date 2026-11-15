import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const order_no = getRouterParams(event).order_no;

		if (!order_no) {
			throw new Error('Order not found');
		}

		return await signedFetch(event, `${Routes.Orders.PaymentStatus(order_no)}`, {
			method: 'GET',
		});
	} catch (err) {
		return err;
	}
});
