import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import ZInputProductVariantDetail from '~/components/Z/Input/Product/Variant/Detail.vue';

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		title: { type: String, default: '' },
		close: { type: [Boolean, Object], default: true },
		ui: { type: Object, default: undefined },
	},
	emits: ['update:open'],
	template: `
		<section data-testid="variant-detail-modal">
			<h2>{{ title }}</h2>
			<slot name="body" />
			<slot name="footer" />
		</section>
	`,
});

describe('ZInputProductVariantDetail', () => {
	it('shows price, inventory, and identity fields then emits close payload on confirm', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantDetail, {
			props: {
				currencyCode: 'MYR',
				otherSkus: ['OTHER'],
				variant: {
					product_code: 'TEE',
					variant_code: 'TEE_Red_M',
					sku: 'RED-M',
					barcode: '123',
					manage_inventory: true,
					allow_preorder: false,
					inventory_quantity: 2,
					price_types: [{ currency_code: 'MYR', orig_sell_price: 40, sale_price: 35, cost_price: 10 }],
				},
			},
			global: {
				stubs: {
					UModal: UModalStub,
				},
			},
		});

		await nextTick();

		const text = wrapper.text();
		expect(text).toContain('TEE · TEE_Red_M');
		expect(text).toContain('SKU');
		expect(text).toContain('Barcode');
		expect(text).toContain('Original sell price');
		expect(text).toContain('Sale price');
		expect(text).toContain('Cost price');
		expect(text).toContain('Inventory');
		expect(text).toContain('Manage Inventory');
		expect(text).toContain('Allow Pre-order');

		const confirmButton = wrapper.findAll('button').find((button) => button.text().includes('Confirm') || button.text().includes('confirm'));
		expect(confirmButton).toBeTruthy();
		await confirmButton!.trigger('click');
		await nextTick();

		expect(wrapper.emitted('close')?.[0]?.[0]).toEqual(
			expect.objectContaining({
				sku: 'RED-M',
				barcode: '123',
				orig_sell_price: 40,
				sale_price: 35,
				cost_price: 10,
				manage_inventory: true,
				allow_preorder: false,
				inventory_quantity: 2,
			}),
		);
	});
});
