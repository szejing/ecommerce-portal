import {
	APP_PLATFORM,
	resolveAppPlatform,
	type AppPlatform,
} from 'yeppi-common';

export type PlatformShellBrand = {
	platform: AppPlatform;
	/** Short marketplace brand for copy (e.g. "Wemotoo" / "Yeppi"). */
	platformName: string;
	appName: string;
	logoSrc: string;
	logoAlt: string;
	faviconIco: string;
	faviconPng: string;
	appleTouchIcon: string;
};

/** Pure Platform Shell brand resolution for CRM chrome (login, favicon, logo alt). */
export function resolvePlatformShellBrand(
	appPlatform?: string | null,
): PlatformShellBrand {
	const platform = resolveAppPlatform(appPlatform ?? undefined);

	if (platform === APP_PLATFORM.YEPPI) {
		return {
			platform,
			platformName: 'Yeppi',
			appName: 'Yeppi Portal',
			logoSrc: '/logo/yeppi-wordmark.png',
			logoAlt: 'Yeppi Portal',
			faviconIco: '/favicon-yeppi.ico',
			faviconPng: '/favicon-yeppi.png',
			appleTouchIcon: '/apple-touch-icon-yeppi.png',
		};
	}

	return {
		platform,
		platformName: 'Wemotoo',
		appName: 'Wemotoo Portal',
		logoSrc: '/logo/logo.png',
		logoAlt: 'Wemotoo Portal',
		faviconIco: '/favicon.ico',
		faviconPng: '/favicon.ico',
		appleTouchIcon: '/favicon.ico',
	};
}

export function resolvePortalAppPlatform(
	appPlatform?: string | null,
): AppPlatform {
	return resolveAppPlatform(appPlatform ?? undefined);
}
