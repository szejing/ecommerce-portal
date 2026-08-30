import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, nextTick } from 'vue';
import ZInputProductVariantList from '~/components/Z/Input/Product/Variant/List.vue';
import type { ProductCreate } from '~/utils/types/form/product-creation';
import type { ProductVariationInput } from '~/utils/types/product-variation';

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		title: { type: String, default: '' },
		open: { type: Boolean, default: false },
		ui: { type: Object, default: undefined },
	},
	emits: ['update:open'],
	template: `
		<section v-if="open" data-testid="variant-detail-modal">
			<h2>{{ title }}</h2>
			<slot name="body" />
			<slot name="footer" />
		</section>
	`,
});

function baseProduct(overrides: Partial<ProductCreate> = {}): ProductCreate {
	return {
		code: 'TEE',
		name: 'Cotton Tee',
		type_id: 1,
		category_codes: [],
		price_types: [{ currency_code: 'MYR', orig_sell_price: 20, sale_price: 15, cost_price: 8 }],
		...overrides,
	};
}

const sizeVariations: ProductVariationInput[] = [
	{
		name: 'Size',
		options: [{ value: 'S' }, { value: 'L' }],
	},
];

const mountOptions = {
	global: {
		stubs: {
			UModal: UModalStub,
		},
	},
};

describe('ZInputProductVariantList', () => {
	it('shows Original Sell Price and Sale Price columns and Apply to all inputs', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [],
			},
			...mountOptions,
		});

		await nextTick();

		expect(wrapper.text()).toContain('Original sell price');
		expect(wrapper.text()).toContain('Sale price');
		expect(wrapper.text()).toContain('Apply To All');
		expect(wrapper.find('input[placeholder="Price"]').exists()).toBe(true);
		expect(wrapper.find('input[placeholder="Sale price"]').exists()).toBe(true);
		expect(wrapper.findAll('button[aria-label="Edit variant"]')).toHaveLength(2);
	});

	it('opens the variant detail modal with SKU, barcode, and cost fields', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [],
			},
			...mountOptions,
		});

		await nextTick();

		await wrapper.find('button[aria-label="Edit variant"]').trigger('click');
		await nextTick();

		const modal = wrapper.find('[data-testid="variant-detail-modal"]');
		expect(modal.exists()).toBe(true);
		expect(modal.text()).toContain('S');
		expect(modal.text()).toContain('SKU');
		expect(modal.text()).toContain('Barcode');
		expect(modal.text()).toContain('Cost price');
		expect(modal.text()).not.toContain('Delete');
	});
});
