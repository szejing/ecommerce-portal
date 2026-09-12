import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { loadNuxtConfig } from '@nuxt/kit';
import en from '../../i18n/locales/en.json';
import { SUPPORTED_LOCALES } from '../../app/utils/constants/i18n';

type LocaleTree = Record<string, string | LocaleTree>;

const flattenLocale = (locale: LocaleTree, prefix = ''): Record<string, string> =>
	Object.fromEntries(
		Object.entries(locale).flatMap(([key, value]) => {
			const path = prefix ? `${prefix}.${key}` : key;
			return typeof value === 'string'
				? [[path, value]]
				: Object.entries(flattenLocale(value, path));
		}),
	);

const extractInterpolationTokens = (message: string) =>
	(message.match(/\{[^{}]+\}/g) ?? []).toSorted();

const extractHtmlTags = (message: string) =>
	message.match(/<\/?[A-Za-z][^>]*>/g) ?? [];

describe('supported locales', () => {
	it('allows Simplified Chinese to be restored from locale storage', () => {
		expect(SUPPORTED_LOCALES).toContain('zh-CN');
	});

	it('configures Nuxt to lazy-load the Simplified Chinese messages', async () => {
		const config = await loadNuxtConfig({ cwd: new URL('../..', import.meta.url).pathname });
		expect(config.i18n?.locales).toContainEqual({
			code: 'zh-CN',
			name: '简体中文',
			file: 'zh-CN.json',
		});
	});

	it('provides a complete Simplified Chinese locale without damaging message tokens', () => {
		const localePath = new URL('../../i18n/locales/zh-CN.json', import.meta.url);
		const localeExists = existsSync(localePath);
		expect(localeExists).toBeTrue();
		if (!localeExists) return;

		const english = flattenLocale(en);
		const simplifiedChinese = flattenLocale(
			JSON.parse(readFileSync(localePath, 'utf8')) as LocaleTree,
		);

		expect(Object.keys(simplifiedChinese)).toEqual(Object.keys(english));
		for (const [key, message] of Object.entries(english)) {
			expect(simplifiedChinese[key]?.trim()).toBeTruthy();
			expect(simplifiedChinese[key]?.match(/\n/g)?.length ?? 0).toBe(
				message.match(/\n/g)?.length ?? 0,
			);
			expect(extractInterpolationTokens(simplifiedChinese[key] ?? '')).toEqual(
				extractInterpolationTokens(message),
			);
			expect(extractHtmlTags(simplifiedChinese[key] ?? '')).toEqual(
				extractHtmlTags(message),
			);
		}
		expect(simplifiedChinese['common.language']).toBe('语言');
		expect(simplifiedChinese['common.simplifiedChinese']).toBe('简体中文');
	});
});
