import { resolvePlatformShellBrand } from '~/utils/platform-shell';

export function usePlatformShell() {
	const runtimeConfig = useRuntimeConfig();
	const brand = computed(() =>
		resolvePlatformShellBrand(
			typeof runtimeConfig.public.appPlatform === 'string'
				? runtimeConfig.public.appPlatform
				: undefined,
		),
	);

	return {
		brand,
		appName: computed(() => brand.value.appName),
		logoSrc: computed(() => brand.value.logoSrc),
		logoAlt: computed(() => brand.value.logoAlt),
		faviconIco: computed(() => brand.value.faviconIco),
		faviconPng: computed(() => brand.value.faviconPng),
		appleTouchIcon: computed(() => brand.value.appleTouchIcon),
		platform: computed(() => brand.value.platform),
	};
}
