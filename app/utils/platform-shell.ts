import {
	APP_PLATFORM,
	resolveAppPlatform,
	type AppPlatform,
} from 'yeppi-common';

export type PlatformShellBrand = {
	platform: AppPlatform;
	appName: string;
	logoSrc: string;
	logoAlt: string;
};

/** Pure Platform Shell brand resolution for CRM chrome (login title, logo alt). */
export function resolvePlatformShellBrand(
	appPlatform?: string | null,
): PlatformShellBrand {
	const platform = resolveAppPlatform(appPlatform ?? undefined);

	if (platform === APP_PLATFORM.YEPPI) {
		return {
			platform,
			appName: 'Yeppi CRM',
			logoSrc: '/logo/logo.png',
			logoAlt: 'Yeppi CRM',
		};
	}

	return {
		platform,
		appName: 'Wemotoo CRM',
		logoSrc: '/logo/logo.png',
		logoAlt: 'Wemotoo CRM',
	};
}

export function resolvePortalAppPlatform(
	appPlatform?: string | null,
): AppPlatform {
	return resolveAppPlatform(appPlatform ?? undefined);
}
