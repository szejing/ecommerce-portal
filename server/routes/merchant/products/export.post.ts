import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	const csv = await signedFetch(event, Routes.Products.Export(), { method: 'POST', responseType: 'blob' });
	setHeader(event, 'Content-Type', 'text/csv');
	setHeader(event, 'Content-Disposition', 'attachment; filename="products.csv"');
	return csv;
});
