export const OAUTH_CONFIGURATION_PATH = '/settings/configuration';

export function oauthCallbackPath(provider: string): string {
	return `/merchant/oauth/${provider}/callback`;
}

export function buildOAuthCallbackUri(origin: string, provider: string): string {
	return `${origin.replace(/\/+$/, '')}${oauthCallbackPath(provider)}`;
}
