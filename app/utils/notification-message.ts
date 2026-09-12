export type NotificationTranslateValues = Record<string, unknown>;

const I18N_KEY_PATTERN = /^[a-zA-Z][\w-]*(?:\.[a-zA-Z][\w-]*)+$/;

function isI18nMessageKey(value: string): boolean {
	return I18N_KEY_PATTERN.test(value);
}

export function resolveNotificationMessage(description: string, values?: NotificationTranslateValues): string {
	try {
		const t = useNuxtApp().$i18n?.t;
		if (typeof t !== 'function') {
			return description;
		}

		const translateIfKey = (input: unknown): unknown => {
			if (typeof input !== 'string' || !isI18nMessageKey(input)) {
				return input;
			}

			return t(input);
		};

		if (!isI18nMessageKey(description)) {
			return description;
		}

		if (!values) {
			return String(t(description));
		}

		const translatedValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, translateIfKey(value)]));
		return String(t(description, translatedValues));
	} catch {
		return description;
	}
}
