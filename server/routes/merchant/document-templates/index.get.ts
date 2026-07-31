import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';

export default defineEventHandler(async (event) => {
	return await signedFetch(event, Routes.DocumentTemplates.List(), { method: 'GET' });
});
