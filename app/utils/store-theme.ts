import { MERCHANT } from 'yeppi-common';

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const merchantCodes = MERCHANT as typeof MERCHANT & {
	THEME_PRIMARY_COLOUR?: string;
};

/** merchant_info Info.ThemePrimaryColour — Store Theme, not Document Brand. */
export const STORE_THEME_PRIMARY_COLOUR_SET_CODE =
	merchantCodes.THEME_PRIMARY_COLOUR ?? 'ThemePrimaryColour';

export function normalizeStoreThemePrimaryColour(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const colour = value.trim();
	if (!colour || !HEX_COLOUR.test(colour)) return null;
	return colour.toUpperCase();
}
