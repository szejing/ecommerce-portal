import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	try {
		const query = getQuery(event);
		const result = await signedFetch(event, Routes.SummSales.ExportShippingDetails(), {
			method: 'POST',
			query,
			responseType: 'blob',
		});
		setHeader(event, 'Content-Type', 'text/csv');
		setHeader(event, 'Content-Disposition', 'attachment; filename="summ_sales_shipping_details.csv"');
		return result;
	} catch (err) {
		return err;
	}
});
