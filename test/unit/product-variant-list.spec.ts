import { describe, expect, it } from 'vitest';
import {
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

describe('variant Sale Price helpers', () => {
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
});
