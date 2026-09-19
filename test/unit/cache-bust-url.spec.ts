import { describe, expect, it } from 'vitest';
import { cacheBustUrl } from '~/utils/cache-bust-url';

describe('cacheBustUrl', () => {
	it('appends a v query param when the url has no query', () => {
		expect(cacheBustUrl('https://cdn.example.com/thumbnail.webp', 1700000000000)).toBe(
			'https://cdn.example.com/thumbnail.webp?v=1700000000000',
		);
	});

	it('appends with & when the url already has a query', () => {
		expect(cacheBustUrl('https://cdn.example.com/thumbnail.webp?x=1', 1700000000000)).toBe(
			'https://cdn.example.com/thumbnail.webp?x=1&v=1700000000000',
		);
	});

	it('replaces an existing v param', () => {
		expect(cacheBustUrl('https://cdn.example.com/thumbnail.webp?v=1', 1700000000000)).toBe(
			'https://cdn.example.com/thumbnail.webp?v=1700000000000',
		);
	});
});
