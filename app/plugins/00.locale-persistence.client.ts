import type { SupportedLocale } from '~/utils/constants/i18n';
import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from '~/utils/constants/i18n';

export default defineNuxtPlugin(() => {
	if (import.meta.client) {
		try {
			const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
			if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
				const { setLocale } = useI18n();
				setLocale(stored as SupportedLocale);
			}
		} catch {
			// ignore localStorage errors (e.g. private mode)
		}
	}
});
