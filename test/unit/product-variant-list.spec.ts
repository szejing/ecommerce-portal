import { describe, expect, it } from 'vitest';
import {
	applyVariantDetailPayload,
	applyVariantListInventoryToAll,
	applyVariantListPricesToAll,
	duplicateVariantSkuIndexes,
	getValidProductOptions,
	getValidProductVariations,
	isDuplicateVariantSku,
	normalizeSalePrice,
	normalizeVariantSku,
	resolveProductVariationId,
} from '../../app/utils/product-variant-list';
import type { ProductVariationInput } from '../../app/utils/types/product-variation';

describe('product-variant-list utils', () => {
	it('includes variations with empty names when options have values', () => {
		const variations: ProductVariationInput[] = [
			{
				name: '',
				options: [
					{ id: 25, variation_id: 9, value: 'husky' },
					{ id: 26, variation_id: 9, value: 'golden' },
				],
			},
			{
				name: '',
				options: [
					{ id: 28, variation_id: 10, value: 'long' },
					{ id: 29, variation_id: 10, value: 'short' },
				],
			},
		];

		expect(getValidProductVariations(variations)).toHaveLength(2);
	});

	it('excludes variations without option values', () => {
		const variations: ProductVariationInput[] = [
			{ name: 'Size', options: [{ value: '' }] },
			{ name: 'Color', options: [{ value: 'red' }] },
		];

		expect(getValidProductVariations(variations)).toHaveLength(1);
		expect(getValidProductVariations(variations)[0]?.name).toBe('Color');
	});

	it('resolves variation id from option when variation id is missing', () => {
		const variation: ProductVariationInput = {
			name: '',
			options: [{ id: 25, variation_id: 9, value: 'husky' }],
		};

		expect(resolveProductVariationId(variation, variation.options[0])).toBe(9);
	});

	it('filters blank option values', () => {
		const variation: ProductVariationInput = {
			name: 'Size',
			options: [{ value: 'long' }, { value: ' ' }, { value: 'short' }],
		};

		expect(getValidProductOptions(variation).map((option) => option.value)).toEqual(['long', 'short']);
	});
});

describe('variant SKU helpers', () => {
	it('treats blank and whitespace SKUs as empty', () => {
		expect(normalizeVariantSku('')).toBeUndefined();
		expect(normalizeVariantSku('   ')).toBeUndefined();
		expect(normalizeVariantSku(' TEE-S ')).toBe('TEE-S');
	});

	it('finds duplicate non-empty SKUs and ignores empty ones', () => {
		expect(duplicateVariantSkuIndexes([{ sku: 'A' }, { sku: '' }, { sku: 'A' }, { sku: 'B' }, { sku: '  ' }])).toEqual([0, 2]);
	});

	it('detects a SKU already used by another variant', () => {
		expect(isDuplicateVariantSku('A', ['B', 'A'])).toBe(true);
		expect(isDuplicateVariantSku('A', ['B'])).toBe(false);
		expect(isDuplicateVariantSku('  ', ['A'])).toBe(false);
	});
});

describe('variant Apply-to-all and detail helpers', () => {
	it('treats empty and zero Sale Price as off', () => {
		expect(normalizeSalePrice(undefined)).toBeUndefined();
		expect(normalizeSalePrice(null)).toBeUndefined();
		expect(normalizeSalePrice('')).toBeUndefined();
		expect(normalizeSalePrice(0)).toBeUndefined();
		expect(normalizeSalePrice('0')).toBeUndefined();
		expect(normalizeSalePrice(12.5)).toBe(12.5);
	});

	it('applies only filled Apply to all prices and skips a zero Sale Price', () => {
		const variants = [
			{ price_types: [{ orig_sell_price: 10, sale_price: 8 }] },
			{ price_types: [{ orig_sell_price: 20, sale_price: undefined }] },
		];

		applyVariantListPricesToAll(variants, 30, undefined);
		expect(variants[0]?.price_types?.[0]).toEqual({ orig_sell_price: 30, sale_price: 8 });
		expect(variants[1]?.price_types?.[0]).toEqual({ orig_sell_price: 30, sale_price: undefined });

		applyVariantListPricesToAll(variants, undefined, 0);
		expect(variants[0]?.price_types?.[0]?.sale_price).toBe(8);

		applyVariantListPricesToAll(variants, undefined, 5);
		expect(variants[0]?.price_types?.[0]?.sale_price).toBe(5);
		expect(variants[1]?.price_types?.[0]?.sale_price).toBe(5);
	});

	it('applies inventory to all with manage on/off and blank qty skip', () => {
		const variants = [
			{ manage_inventory: false, allow_preorder: true, inventory_quantity: 9 },
			{ manage_inventory: true, allow_preorder: false, inventory_quantity: 2 },
		];

		applyVariantListInventoryToAll(variants, true, true, 5);
		expect(variants[0]).toEqual({ manage_inventory: true, allow_preorder: true, inventory_quantity: 5 });
		expect(variants[1]).toEqual({ manage_inventory: true, allow_preorder: true, inventory_quantity: 5 });

		applyVariantListInventoryToAll(variants, true, false, undefined);
		expect(variants[0]).toEqual({ manage_inventory: true, allow_preorder: false, inventory_quantity: 5 });
		expect(variants[1]).toEqual({ manage_inventory: true, allow_preorder: false, inventory_quantity: 5 });

		applyVariantListInventoryToAll(variants, false, true, 99);
		expect(variants[0]).toEqual({ manage_inventory: false, allow_preorder: false, inventory_quantity: 5 });
		expect(variants[1]).toEqual({ manage_inventory: false, allow_preorder: false, inventory_quantity: 5 });

		applyVariantListInventoryToAll(variants, true, false, 0);
		expect(variants[0]?.inventory_quantity).toBe(0);
		expect(variants[1]?.inventory_quantity).toBe(0);
	});

	it('merges detail-modal payload onto prices and inventory fields', () => {
		const variant = {
			sku: 'OLD',
			barcode: '111',
			manage_inventory: false,
			allow_preorder: false,
			inventory_quantity: 0,
			price_types: [{ orig_sell_price: 10, sale_price: 8, cost_price: 3, currency_code: 'MYR' }],
		};

		applyVariantDetailPayload(variant, {
			sku: 'NEW-SKU',
			barcode: '999',
			orig_sell_price: 25,
			sale_price: 0,
			cost_price: 12,
			manage_inventory: true,
			allow_preorder: true,
			inventory_quantity: 4,
		});

		expect(variant).toEqual({
			sku: 'NEW-SKU',
			barcode: '999',
			manage_inventory: true,
			allow_preorder: true,
			inventory_quantity: 4,
			price_types: [{ orig_sell_price: 25, sale_price: undefined, cost_price: 12, currency_code: 'MYR' }],
		});
	});
});
