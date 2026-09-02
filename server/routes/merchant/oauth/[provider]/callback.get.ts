import { KEY } from 'yeppi-common';
import { signedFetch } from '#root/server/base_api';
import { Routes } from '#root/server/routes.server';
import {
	OAUTH_CONFIGURATION_PATH,
	buildOAuthCallbackUri,
} from '#root/server/utils/oauth';

export default defineEventHandler(async (event) => {
	const accessToken = getCookie(event, KEY.ACCESS_TOKEN);
	if (!accessToken) {
		return sendRedirect(event, '/login', 302);
	}

	const provider = getRouterParam(event, 'provider') ?? '';
	const query = getQuery(event);
	const redirectUri = buildOAuthCallbackUri(getRequestURL(event).origin, provider);

	try {
		await signedFetch(event, Routes.OAuth.Callback(provider), {
			method: 'POST',
			body: {
				code: query.code,
				state: query.state,
				redirect_uri: redirectUri,
			},
		});
		return sendRedirect(event, OAUTH_CONFIGURATION_PATH, 302);
	} catch {
		return sendRedirect(event, OAUTH_CONFIGURATION_PATH, 302);
	}
});
