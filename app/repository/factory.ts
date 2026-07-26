import type { NitroFetchOptions } from 'nitropack';
import { ApiErrorModel } from '~/utils/types/api-error-model';

interface IHttpFactory {
	method:
		| 'GET'
		| 'HEAD'
		| 'PATCH'
		| 'POST'
		| 'PUT'
		| 'DELETE'
		| 'CONNECT'
		| 'OPTIONS'
		| 'TRACE'
		| 'get'
		| 'head'
		| 'patch'
		| 'post'
		| 'put'
		| 'delete'
		| 'connect'
		| 'options'
		| 'trace';
	url: string;
	fetchOptions?: NitroFetchOptions<'json'>;
	body?: object;
	query?: object;
	headers?: Record<string, string>;
}

class HttpFactory {
	async call<T>({
		method,
		url,
		fetchOptions,
		body,
		query,
		headers,
	}: IHttpFactory): Promise<T> {
		try {
			// FormData must not get an explicit Content-Type — the runtime sets
			// multipart/form-data with the correct boundary. A forced
			// application/json breaks Nitro readFormData on proxy routes.
			const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
			const mergedHeaders: Record<string, string> = {
				...(isFormData ? {} : { 'Content-Type': 'application/json' }),
				...(headers ?? {}),
				...((fetchOptions?.headers as Record<string, string> | undefined) ?? {}),
			};
			if (isFormData) {
				delete mergedHeaders['Content-Type'];
				delete mergedHeaders['content-type'];
			}

			return await $fetch<T>(url, {
				...fetchOptions,
				method,
				body,
				query,
				headers: mergedHeaders,
			});
		} catch (error: any) {
			// if (error instanceof 401) {
			// 	refresh token -> call again
			// }
			const apiError = error?.data?.data?.error;
			throw apiError?.message ? apiError : new ApiErrorModel(500, 'Internal Server Error');
		}
	}
}
export default HttpFactory;
