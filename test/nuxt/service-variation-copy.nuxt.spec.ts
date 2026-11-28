import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import ZInputProductAdditionalInfo from '~/components/Z/Input/Product/AdditionalInfo.vue';
import type { ProductCreate } from '~/utils/types/form/product-creation';

mockNuxtImport('useOverlay', () => () => ({
	create: vi.fn(() => ({ open: vi.fn() })),
}));

function baseProduct(): ProductCreate {
	return {
		code: 'CUT',
		name: 'Haircut',
		type_id: 2,
		category_codes: [],
		variations: [{ name: '', options: [] }],
		variants: [],
	};
}

const mountOptions = {
	global: {
		stubs: {
			UTooltip: { props: ['text'], template: '<span class="tooltip-stub">{{ text }}</span>' },
		},
	},
};

describe('service variation copy', () => {
	it('shows service variant examples when booking is on', async () => {
		const wrapper = await mountSuspended(ZInputProductAdditionalInfo, {
			props: { product: baseProduct(), section: 'booking' },
			...mountOptions,
		});

		expect(wrapper.text()).toContain('Service Variants');
		expect(wrapper.text()).toContain('Add options like technician or session length');
		expect(wrapper.text()).toContain('Each combination, such as a technician, is its own bookable variant.');
		expect(wrapper.text()).not.toContain('Product Variants');
		expect(wrapper.html()).toContain('e.g. Technician, Session');
	});

	it('keeps size and color examples on a product', async () => {
		const wrapper = await mountSuspended(ZInputProductAdditionalInfo, {
			props: { product: { ...baseProduct(), type_id: 1 }, section: 'variations' },
			...mountOptions,
		});

		expect(wrapper.text()).toContain('Product Variants');
		expect(wrapper.text()).toContain('Add options like size, color, or other variations');
		expect(wrapper.text()).toContain('Add variants like sizes, colors, or other options. Each combination creates a unique variant.');
		expect(wrapper.text()).not.toContain('Service Variants');
		expect(wrapper.html()).toContain('e.g. Color, Size');
	});
});
