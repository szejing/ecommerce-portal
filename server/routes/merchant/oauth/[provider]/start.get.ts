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
	const redirectUri = buildOAuthCallbackUri(getRequestURL(event).origin, provider);

	try {
		const result = await signedFetch(event, Routes.OAuth.Start(provider), {
			method: 'GET',
			query: { redirect_uri: redirectUri },
		});
		const authorizeUrl = (result as { authorize_url?: string })?.authorize_url;
		if (!authorizeUrl) {
			return sendRedirect(event, OAUTH_CONFIGURATION_PATH, 302);
		}
		return sendRedirect(event, authorizeUrl, 302);
	} catch {
		return sendRedirect(event, OAUTH_CONFIGURATION_PATH, 302);
	}
});
