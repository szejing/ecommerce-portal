import { describe, expect, it } from 'vitest';
import {
	STORE_THEME_PRIMARY_COLOUR_SET_CODE,
	normalizeStoreThemePrimaryColour,
} from '../../app/utils/store-theme';

describe('Store Theme primary colour (Store Profile contract)', () => {
	it('uses the merchant_info ThemePrimaryColour set code', () => {
		expect(STORE_THEME_PRIMARY_COLOUR_SET_CODE).toBe('ThemePrimaryColour');
	});

	it('normalises hex colours and rejects Document Brand-style non-hex values', () => {
		expect(normalizeStoreThemePrimaryColour('#c41e3a')).toBe('#C41E3A');
		expect(normalizeStoreThemePrimaryColour('')).toBeNull();
		expect(normalizeStoreThemePrimaryColour('blue')).toBeNull();
	});
});
