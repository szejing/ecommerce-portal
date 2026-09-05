import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import ZInputProductVariantList from '~/components/Z/Input/Product/Variant/List.vue';
import type { ProductCreate } from '~/utils/types/form/product-creation';
import type { ProductVariationInput } from '~/utils/types/product-variation';

const overlayOpen = vi.fn();
const overlayCreate = vi.fn(() => ({
	open: overlayOpen,
}));

mockNuxtImport('useOverlay', () => () => ({
	create: overlayCreate,
}));

const successNotification = vi.fn();
vi.mock('~/stores/AppUi/AppUi', () => ({
	successNotification: (...args: unknown[]) => successNotification(...args),
}));

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

describe('ZInputProductVariantList', () => {
	it('shows Original Sell Price and Sale Price columns and Apply to all inputs', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [],
			},
		});

		await nextTick();

		expect(wrapper.text()).toContain('Original sell price');
		expect(wrapper.text()).toContain('Sale price');
		expect(wrapper.text()).toContain('Apply To All');
		expect(wrapper.text()).toContain('Manage Inventory');
		expect(wrapper.text()).toContain('Allow Pre-order');
		expect(wrapper.find('input[placeholder="Price"]').exists()).toBe(true);
		expect(wrapper.find('input[placeholder="Sale price"]').exists()).toBe(true);
		expect(wrapper.find('input[placeholder="Quantity"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('Stock');
		expect(wrapper.findAll('button[aria-label="Edit variant"]')).toHaveLength(2);
	});

	it('shows On Hand Quantity in Apply bar only when Manage Inventory is on', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [],
			},
		});

		await nextTick();

		const manageCheckbox = wrapper.findAllComponents({ name: 'UCheckbox' }).find((c) => c.props('name') === 'applyAllManageInventory');
		const allowCheckbox = wrapper.findAllComponents({ name: 'UCheckbox' }).find((c) => c.props('name') === 'applyAllAllowPreorder');
		expect(manageCheckbox).toBeTruthy();
		expect(allowCheckbox?.props('disabled')).toBe(true);

		await manageCheckbox!.vm.$emit('update:modelValue', true);
		await nextTick();

		expect(wrapper.find('input[placeholder="Quantity"]').exists()).toBe(true);
		expect(allowCheckbox?.props('disabled')).toBe(false);

		await manageCheckbox!.vm.$emit('update:modelValue', false);
		await nextTick();

		expect(wrapper.find('input[placeholder="Quantity"]').exists()).toBe(false);
		expect(allowCheckbox?.props('disabled')).toBe(true);
	});

	it('shows Stock column quantity when a variant has Manage Inventory on', async () => {
		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [
					{
						name: 'S',
						manage_inventory: true,
						inventory_quantity: 4,
						price_types: [{ currency_code: 'MYR', orig_sell_price: 20 }],
						options: [{ value: 'S' }],
					},
					{
						name: 'L',
						manage_inventory: false,
						inventory_quantity: 0,
						price_types: [{ currency_code: 'MYR', orig_sell_price: 22 }],
						options: [{ value: 'L' }],
					},
				],
			},
		});

		await nextTick();

		expect(wrapper.text()).toContain('Stock');
		expect(wrapper.find('input[placeholder="Stock"]').exists()).toBe(true);
		expect(wrapper.find('input[placeholder="Stock"]').element).toHaveProperty('value', '4');
	});

	it('toasts success after Apply To All', async () => {
		successNotification.mockClear();

		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [],
			},
		});

		await nextTick();

		const buttons = wrapper.findAll('button');
		const applyBtn = buttons.find((b) => b.text().includes('Apply To All'));
		expect(applyBtn).toBeTruthy();
		await applyBtn!.trigger('click');
		await nextTick();

		expect(successNotification).toHaveBeenCalledWith('Applied to all variants');
	});

	it('opens the variant detail modal programmatically with row props', async () => {
		overlayOpen.mockReset();
		overlayOpen.mockReturnValue({ result: Promise.resolve(undefined) });

		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [
					{
						name: 'S',
						product_code: 'TEE',
						variant_code: 'TEE_S',
						sku: 'TEE-S',
						barcode: '111',
						manage_inventory: true,
						allow_preorder: false,
						inventory_quantity: 3,
						price_types: [{ currency_code: 'MYR', orig_sell_price: 20, sale_price: 15, cost_price: 8 }],
						options: [{ value: 'S' }],
					},
					{
						name: 'L',
						product_code: 'TEE',
						variant_code: 'TEE_L',
						sku: 'TEE-L',
						price_types: [{ currency_code: 'MYR', orig_sell_price: 22, sale_price: undefined, cost_price: 9 }],
						options: [{ value: 'L' }],
					},
				],
			},
		});

		await nextTick();
		overlayCreate.mockClear();
		overlayOpen.mockClear();
		overlayOpen.mockReturnValue({ result: Promise.resolve(undefined) });

		await wrapper.find('button[aria-label="Edit variant"]').trigger('click');
		await nextTick();

		expect(overlayCreate).toHaveBeenCalledTimes(1);
		expect(overlayOpen).toHaveBeenCalledWith(
			expect.objectContaining({
				currencyCode: 'MYR',
				otherSkus: ['TEE-L'],
				variant: expect.objectContaining({
					product_code: 'TEE',
					variant_code: 'TEE_S',
					sku: 'TEE-S',
					barcode: '111',
					manage_inventory: true,
					inventory_quantity: 3,
				}),
			}),
		);
	});

	it('applies confirmed detail payload onto the variant row', async () => {
		overlayCreate.mockClear();
		overlayOpen.mockReset();
		overlayOpen.mockReturnValue({
			result: Promise.resolve({
				sku: 'TEE-S-NEW',
				barcode: '999',
				orig_sell_price: 30,
				sale_price: 18,
				cost_price: 11,
				manage_inventory: true,
				allow_preorder: true,
				inventory_quantity: 7,
			}),
		});

		const wrapper = await mountSuspended(ZInputProductVariantList, {
			props: {
				product: baseProduct(),
				variations: sizeVariations,
				variants: [
					{
						name: 'S',
						sku: 'TEE-S',
						price_types: [{ currency_code: 'MYR', orig_sell_price: 20, sale_price: 15, cost_price: 8 }],
						options: [{ value: 'S' }],
					},
					{
						name: 'L',
						sku: 'TEE-L',
						price_types: [{ currency_code: 'MYR', orig_sell_price: 22 }],
						options: [{ value: 'L' }],
					},
				],
			},
		});

		await nextTick();
		await wrapper.find('button[aria-label="Edit variant"]').trigger('click');
		await nextTick();
		await Promise.resolve();
		await nextTick();

		const emitted = wrapper.emitted('update:variants');
		expect(emitted?.length).toBeGreaterThan(0);
		const latest = emitted?.[emitted.length - 1]?.[0] as Array<Record<string, unknown>>;
		expect(latest[0]).toEqual(
			expect.objectContaining({
				sku: 'TEE-S-NEW',
				barcode: '999',
				manage_inventory: true,
				allow_preorder: true,
				inventory_quantity: 7,
				price_types: [expect.objectContaining({ orig_sell_price: 30, sale_price: 18, cost_price: 11 })],
			}),
		);
	});
});
