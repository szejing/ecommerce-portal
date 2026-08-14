import { describe, expect, it } from 'vitest';
import { APP_PLATFORM } from 'yeppi-common';
import {
	resolvePlatformShellBrand,
	resolvePortalAppPlatform,
} from '../../app/utils/platform-shell';

describe('resolvePortalAppPlatform', () => {
	it('defaults to wemotoo when unset or invalid', () => {
		expect(resolvePortalAppPlatform(undefined)).toBe(APP_PLATFORM.WEMOTOO);
		expect(resolvePortalAppPlatform('')).toBe(APP_PLATFORM.WEMOTOO);
		expect(resolvePortalAppPlatform('nope')).toBe(APP_PLATFORM.WEMOTOO);
	});

	it('resolves yeppi from APP_PLATFORM env values', () => {
		expect(resolvePortalAppPlatform('yeppi')).toBe(APP_PLATFORM.YEPPI);
		expect(resolvePortalAppPlatform('YEPPI')).toBe(APP_PLATFORM.YEPPI);
	});
});

describe('resolvePlatformShellBrand', () => {
	it('uses Yeppi CRM chrome for yeppi platform', () => {
		expect(resolvePlatformShellBrand('yeppi')).toEqual({
			platform: APP_PLATFORM.YEPPI,
			appName: 'Yeppi CRM',
			logoSrc: '/logo/logo.png',
			logoAlt: 'Yeppi CRM',
		});
	});

	it('uses Wemotoo CRM chrome by default', () => {
		expect(resolvePlatformShellBrand()).toEqual({
			platform: APP_PLATFORM.WEMOTOO,
			appName: 'Wemotoo CRM',
			logoSrc: '/logo/logo.png',
			logoAlt: 'Wemotoo CRM',
		});
	});
});
