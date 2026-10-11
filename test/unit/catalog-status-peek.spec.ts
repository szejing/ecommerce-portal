import { describe, expect, it } from 'bun:test';
import { LineType, ProductStatus, ProductType } from 'yeppi-common';
import {
	buildCatalogStatusPeekModel,
	resolveCatalogGrain,
	resolveCatalogPriceType,
	resolveCatalogSellability,
} from '../../app/utils/catalog-status-peek';
import type { ItemModel } from '../../app/utils/models/item.model';
import type { Product } from '../../app/utils/types/product';

function baseItem(overrides: Partial<ItemModel> = {}): ItemModel {
	return {
		item_line: 1,
		parent_item_line: 1,
		prod_code: 'SHIRT',
		prod_name: 'Shirt',
		currency_code: 'MYR',
		qty: 2,
		unit_sell_price: 45,
		orig_sell_price: 50,
		gross_amt: 90,
		net_amt: 90,
		gross_amt_exc: 90,
		net_amt_exc: 90,
		status: 'active' as ItemModel['status'],
		taxes: [],
		...overrides,
	};
}

describe('catalog status peek helpers', () => {
	it('prefers order currency Price Type then falls back to first', () => {
		const prices = [
			{ id: 1, currency_code: 'USD', orig_sell_price: 10, sale_price: 9, cost_price: 4 },
			{ id: 2, currency_code: 'MYR', orig_sell_price: 40, sale_price: 35, cost_price: 20 },
		];
		expect(resolveCatalogPriceType(prices, 'MYR')?.id).toBe(2);
		expect(resolveCatalogPriceType(prices, 'SGD')?.id).toBe(1);
		expect(resolveCatalogPriceType(undefined, 'MYR')).toBeUndefined();
	});

	it('resolves variant grain when ordered variant exists', () => {
		const product = {
			code: 'SHIRT',
			name: 'Shirt',
			manage_inventory: false,
			inventory_quantity: 99,
			price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 1 }],
			variants: [
				{
					variant_code: 'RED-M',
					manage_inventory: true,
					inventory_quantity: 3,
					allow_preorder: true,
					sku: 'SKU-R',
					barcode: 'BC-R',
					price_types: [{ id: 2, currency_code: 'MYR', orig_sell_price: 50, sale_price: 45, cost_price: 20 }],
				},
			],
			updated_at: new Date(),
		} as Product;

		const grain = resolveCatalogGrain(product, 'RED-M');
		expect(grain.manageInventory).toBe(true);
		expect(grain.inventoryQuantity).toBe(3);
		expect(grain.sku).toBe('SKU-R');
		expect(grain.priceTypes?.[0]?.id).toBe(2);
	});

	it('marks archived and sellable products', () => {
		expect(resolveCatalogSellability({ is_active: false, status: ProductStatus.PUBLISHED, updated_at: new Date() } as Product)).toBe('archived');
		expect(resolveCatalogSellability({ is_active: true, status: ProductStatus.PUBLISHED, updated_at: new Date() } as Product)).toBe('sellable');
		expect(resolveCatalogSellability({ is_active: true, status: ProductStatus.DRAFT, updated_at: new Date() } as Product)).toBe('draft');
	});

	it('builds a found product peek with ordered-as and live status rows', () => {
		const product = {
			code: 'SHIRT',
			name: 'Shirt Live',
			type: ProductType.ITEM,
			composition: 'single',
			is_active: true,
			status: ProductStatus.PUBLISHED,
			manage_inventory: true,
			inventory_quantity: 7,
			allow_preorder: false,
			price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 50, sale_price: 45, cost_price: 20 }],
			variants: [],
			updated_at: new Date(),
		} as Product;

		const model = buildCatalogStatusPeekModel({
			product,
			item: baseItem({ unit_sell_price: 42, is_preorder: true }),
			orderCurrency: 'MYR',
		});

		expect(model.found).toBe(true);
		expect(model.kind).toBe('product');
		expect(model.sellability).toBe('sellable');
		expect(model.orderedAs).toEqual({ qty: 2, unitSellPrice: 42, currencyCode: 'MYR', isPreorder: true });
		expect(model.catalogPath).toBe('/products/SHIRT');
		expect(model.statusRows.find((r) => r.id === 'available_quantity')?.display).toBe('7');
		expect(model.statusRows.find((r) => r.id === 'cost_price')?.display).toContain('20');
	});

	it('builds combo peek with bottleneck qty and components; services mark inventory N/A', () => {
		const combo = buildCatalogStatusPeekModel({
			product: {
				code: 'MEAL',
				name: 'Meal',
				composition: 'fixed_combo',
				is_active: true,
				status: ProductStatus.PUBLISHED,
				combo_available_quantity: 4,
				price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 30 }],
				combo_component_details: [{ product_code: 'DRINK', product_name: 'Drink', quantity: 1 }],
				updated_at: new Date(),
			} as Product,
			item: baseItem({ prod_code: 'MEAL', prod_name: 'Meal', line_type: LineType.COMBO_HEADER }),
			orderCurrency: 'MYR',
		});
		expect(combo.kind).toBe('fixed_combo');
		expect(combo.catalogPath).toBe('/products/combos/MEAL');
		expect(combo.statusRows.find((r) => r.id === 'available_quantity')?.display).toBe('4');
		expect(combo.statusRows.some((r) => r.id === 'allow_preorder')).toBe(false);
		expect(combo.components).toEqual([{ product_code: 'DRINK', product_name: 'Drink', variant_name: undefined, quantity: 1 }]);

		const service = buildCatalogStatusPeekModel({
			product: {
				code: 'SVC',
				name: 'Cut',
				type: ProductType.SERVICE,
				is_active: true,
				status: ProductStatus.PUBLISHED,
				price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 80 }],
				updated_at: new Date(),
			} as Product,
			item: baseItem({ prod_code: 'SVC', prod_name: 'Cut' }),
			orderCurrency: 'MYR',
		});
		expect(service.kind).toBe('service');
		expect(service.statusRows.find((r) => r.id === 'manage_inventory')?.display).toBe('na');
	});

	it('keeps ordered-as when catalog product is missing', () => {
		const model = buildCatalogStatusPeekModel({
			product: null,
			item: baseItem({ qty: 1, unit_sell_price: 12 }),
			orderCurrency: 'MYR',
		});
		expect(model.found).toBe(false);
		expect(model.catalogPath).toBeNull();
		expect(model.statusRows).toEqual([]);
		expect(model.orderedAs.unitSellPrice).toBe(12);
	});

	it('does not fall back to product inventory when ordered variant is missing', () => {
		const model = buildCatalogStatusPeekModel({
			product: {
				code: 'SHIRT',
				name: 'Shirt',
				type: ProductType.ITEM,
				is_active: true,
				status: ProductStatus.PUBLISHED,
				manage_inventory: true,
				inventory_quantity: 99,
				price_types: [{ id: 1, currency_code: 'MYR', orig_sell_price: 50 }],
				variants: [{ variant_code: 'OTHER', manage_inventory: true, inventory_quantity: 1, price_types: [] }],
				updated_at: new Date(),
			} as Product,
			item: baseItem({ prod_variant_code: 'RED-M' }),
			orderCurrency: 'MYR',
		});
		expect(model.statusRows.find((r) => r.id === 'available_quantity')?.display).toBe('—');
		expect(model.statusRows.find((r) => r.id === 'orig_sell_price')?.display).toBe('—');
	});
});
