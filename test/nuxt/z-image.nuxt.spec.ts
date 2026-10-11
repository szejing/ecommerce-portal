import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ZImage from '~/components/Z/Image.vue';

describe('ZImage', () => {
	it('renders image with blurred background and default square size', async () => {
		const wrapper = await mountSuspended(ZImage, {
			props: {
				src: 'https://example.com/logo.png',
				alt: 'Store logo',
			},
		});

		const root = wrapper.find('div.relative');
		expect(root.attributes('style')).toContain('width: 32px');
		expect(root.attributes('style')).toContain('height: 32px');

		const img = wrapper.find('img');
		expect(img.attributes('src')).toBe('https://example.com/logo.png');
		expect(img.attributes('alt')).toBe('Store logo');

		const blur = wrapper.find('div.absolute');
		expect(blur.attributes('style')).toContain('url(https://example.com/logo.png)');
	});

	it('applies custom width and height', async () => {
		const wrapper = await mountSuspended(ZImage, {
			props: {
				src: 'https://example.com/logo.png',
				width: 48,
				height: 48,
			},
		});

		const root = wrapper.find('div.relative');
		expect(root.attributes('style')).toContain('width: 48px');
		expect(root.attributes('style')).toContain('height: 48px');
	});

	it('stretches to the parent size without inline dimensions when filled', async () => {
		const wrapper = await mountSuspended(ZImage, {
			props: {
				src: 'https://example.com/logo.png',
				fill: true,
			},
		});

		const root = wrapper.find('div.relative');
		expect(root.classes()).toContain('h-full');
		expect(root.classes()).toContain('w-full');
		expect(root.attributes('style')).toBeUndefined();
	});

	it('falls back to product-holder when the image fails to load', async () => {
		const wrapper = await mountSuspended(ZImage, {
			props: {
				src: 'https://example.com/broken.png',
				alt: 'Broken product image',
			},
		});

		const img = wrapper.find('img');
		await img.trigger('error');

		expect(img.attributes('src')).toBe('/svg/product-holder.svg');

		const blur = wrapper.find('div.absolute');
		expect(blur.attributes('style')).toContain('url(/svg/product-holder.svg)');
	});
});
