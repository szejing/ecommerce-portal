import { describe, expect, it } from 'vitest';
import { mapCatalogVariantToOrderItemFields, resolveCatalogVariantSellPrice } from '../../app/utils/order-item-variant';
import type { ProductVariant } from '../../app/utils/types/product-variant';

const baseVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
	variant_code: 'VAR-RED-M',
	product_code: 'TEE',
	name: 'Red / M',
	sku: 'SKU-RED-M',
	barcode: '1234567890123',
	price_types: [
		{
			id: 1,
			currency_code: 'MYR',
			orig_sell_price: 40,
			sale_price: 35,
		},
	],
	...overrides,
});

describe('order-item-variant', () => {
	it('prefers sale_price over orig_sell_price for unit sell price', () => {
		expect(resolveCatalogVariantSellPrice(baseVariant())).toBe(35);
	});

	it('falls back to orig_sell_price when sale_price is missing', () => {
		expect(
			resolveCatalogVariantSellPrice(
				baseVariant({
					price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 40 }],
				}),
			),
		).toBe(40);
	});

	it('maps catalog variant identity and prices onto order line fields', () => {
		expect(mapCatalogVariantToOrderItemFields(baseVariant())).toEqual({
			prod_variant_code: 'VAR-RED-M',
			prod_variant_name: 'Red / M',
			prod_variant_sku: 'SKU-RED-M',
			prod_variant_barcode: '1234567890123',
			unit_sell_price: 35,
			orig_sell_price: 40,
		});
	});

	it('returns undefined when catalog price is missing so the UI can block the swap', () => {
		expect(mapCatalogVariantToOrderItemFields(baseVariant({ price_types: [] }))).toBeUndefined();
		expect(mapCatalogVariantToOrderItemFields(baseVariant({ price_types: undefined }))).toBeUndefined();
	});
});
