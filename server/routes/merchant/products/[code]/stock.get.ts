import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
  const code = getRouterParams(event).code;
  if (!code) throw createError({ statusCode: 400, statusMessage: 'Product Code is required' });
  return signedFetch(event, Routes.Products.Stock(code), { method: 'GET', query: getQuery(event) });
});
