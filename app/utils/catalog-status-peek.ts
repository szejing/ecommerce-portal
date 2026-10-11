import { LineType, ProductStatus, ProductType, formatCurrency } from 'yeppi-common';
import type { ItemModel } from '~/utils/models/item.model';
import type { Price } from '~/utils/types/price';
import type { Product } from '~/utils/types/product';
import type { ProductVariant } from '~/utils/types/product-variant';
import { orderItemDetailPath } from '~/utils/product-route';

export type CatalogStatusRowId =
	| 'manage_inventory'
	| 'available_quantity'
	| 'allow_preorder'
	| 'orig_sell_price'
	| 'sale_price'
	| 'cost_price'
	| 'currency'
	| 'sku'
	| 'barcode';

export type CatalogStatusRow = {
	id: CatalogStatusRowId;
	/** i18n key under components.zModal.catalogStatusPeek.rows.* */
	labelKey: string;
	display: string;
};

export type CatalogStatusSellability = 'sellable' | 'hidden' | 'archived' | 'draft' | 'unknown';

export type CatalogStatusComponentRow = {
	product_code: string;
	product_name: string;
	variant_name?: string;
	quantity: number;
};

export type CatalogStatusPeekModel = {
	found: boolean;
	code: string;
	name: string;
	thumbnailUrl?: string;
	catalogPath: string | null;
	kind: 'product' | 'service' | 'fixed_combo';
	sellability: CatalogStatusSellability;
	orderedAs: {
		qty: number;
		unitSellPrice: number;
		currencyCode?: string;
		isPreorder: boolean;
	};
	statusRows: CatalogStatusRow[];
	components: CatalogStatusComponentRow[];
};

export type CatalogGrain = {
	/** Ordered Variant code was set but not present on the live product. */
	missingOrderedVariant?: boolean;
	manageInventory?: boolean;
	inventoryQuantity?: number | null;
	allowPreorder?: boolean;
	sku?: string;
	barcode?: string;
	priceTypes?: Price[];
};

export function resolveCatalogPriceType(priceTypes: Price[] | undefined, orderCurrency?: string): Price | undefined {
	if (!priceTypes?.length) return undefined;
	const currency = orderCurrency?.trim().toUpperCase();
	if (currency) {
		const match = priceTypes.find((pt) => pt.currency_code?.trim().toUpperCase() === currency);
		if (match) return match;
	}
	return priceTypes[0];
}

export function resolveCatalogGrain(product: Product, variantCode?: string | null): CatalogGrain {
	const variants = product.variants ?? [];
	const code = variantCode?.trim();
	if (code) {
		const variant = variants.find((v) => v.variant_code === code);
		if (variant) return grainFromVariant(variant);
		// Ordered Variant missing from live catalog — do not fall back to product inventory/prices.
		return { missingOrderedVariant: true };
	}
	return {
		manageInventory: product.manage_inventory,
		inventoryQuantity: product.inventory_quantity,
		allowPreorder: product.allow_preorder,
		sku: undefined,
		barcode: undefined,
		priceTypes: product.price_types,
	};
}

function grainFromVariant(variant: ProductVariant): CatalogGrain {
	return {
		manageInventory: variant.manage_inventory,
		inventoryQuantity: variant.inventory_quantity,
		allowPreorder: variant.allow_preorder,
		sku: variant.sku,
		barcode: variant.barcode,
		priceTypes: variant.price_types,
	};
}

export function resolveCatalogSellability(product: Product): CatalogStatusSellability {
	if (product.is_active === false) return 'archived';
	if (product.status === ProductStatus.DRAFT) return 'draft';
	if (product.status === ProductStatus.PUBLISHED && product.is_active !== false) return 'sellable';
	if (product.status === ProductStatus.REJECTED) return 'hidden';
	return 'unknown';
}

export function resolveCatalogKind(product: Product, item: ItemModel): CatalogStatusPeekModel['kind'] {
	if (item.line_type === LineType.COMBO_HEADER || product.composition === 'fixed_combo') return 'fixed_combo';
	if (product.type === ProductType.SERVICE) return 'service';
	return 'product';
}

function yesNo(value: boolean | undefined): string {
	if (value === true) return 'yes';
	if (value === false) return 'no';
	return '—';
}

function money(amount: number | undefined | null, currency?: string): string {
	if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return '—';
	return formatCurrency(Number(amount), currency);
}

export function buildCatalogStatusPeekModel(input: {
	product: Product | null | undefined;
	item: ItemModel;
	orderCurrency?: string;
}): CatalogStatusPeekModel {
	const { item, orderCurrency } = input;
	const orderedAs = {
		qty: item.qty,
		unitSellPrice: item.unit_sell_price,
		currencyCode: orderCurrency ?? item.currency_code,
		isPreorder: !!item.is_preorder,
	};

	const catalogPath = orderItemDetailPath(item);

	if (!input.product) {
		return {
			found: false,
			code: item.prod_code,
			name: item.prod_name,
			thumbnailUrl: item.thumbnail?.url,
			catalogPath: null,
			kind: item.line_type === LineType.COMBO_HEADER ? 'fixed_combo' : 'product',
			sellability: 'unknown',
			orderedAs,
			statusRows: [],
			components: [],
		};
	}

	const product = input.product;
	const kind = resolveCatalogKind(product, item);
	const isCombo = kind === 'fixed_combo';
	const isService = kind === 'service';
	const grain = isCombo ? {
		manageInventory: undefined,
		inventoryQuantity: product.combo_available_quantity,
		allowPreorder: undefined,
		sku: undefined,
		barcode: undefined,
		priceTypes: product.price_types,
	} : resolveCatalogGrain(product, item.prod_variant_code);

	const price = resolveCatalogPriceType(grain.priceTypes, orderCurrency ?? item.currency_code);
	const currency = price?.currency_code ?? orderCurrency ?? item.currency_code;

	const statusRows: CatalogStatusRow[] = [];

	if (isService) {
		statusRows.push(
			{ id: 'manage_inventory', labelKey: 'manageInventory', display: 'na' },
			{ id: 'available_quantity', labelKey: 'availableQuantity', display: 'na' },
			{ id: 'allow_preorder', labelKey: 'allowPreorder', display: 'na' },
		);
	} else if (isCombo) {
		const qty = product.combo_available_quantity;
		statusRows.push({
			id: 'available_quantity',
			labelKey: 'availableQuantity',
			display: qty === null || qty === undefined ? 'unlimited' : String(qty),
		});
	} else if (grain.missingOrderedVariant) {
		statusRows.push(
			{ id: 'manage_inventory', labelKey: 'manageInventory', display: '—' },
			{ id: 'available_quantity', labelKey: 'availableQuantity', display: '—' },
			{ id: 'allow_preorder', labelKey: 'allowPreorder', display: '—' },
		);
	} else {
		const managed = !!grain.manageInventory;
		statusRows.push({ id: 'manage_inventory', labelKey: 'manageInventory', display: yesNo(grain.manageInventory) });
		statusRows.push({
			id: 'available_quantity',
			labelKey: 'availableQuantity',
			display: managed ? String(grain.inventoryQuantity ?? 0) : 'unlimited',
		});
		statusRows.push({ id: 'allow_preorder', labelKey: 'allowPreorder', display: yesNo(grain.allowPreorder) });
	}

	statusRows.push(
		{ id: 'orig_sell_price', labelKey: 'origSellPrice', display: money(price?.orig_sell_price, currency) },
		{ id: 'sale_price', labelKey: 'salePrice', display: money(price?.sale_price, currency) },
		{ id: 'cost_price', labelKey: 'costPrice', display: money(price?.cost_price, currency) },
		{ id: 'currency', labelKey: 'currency', display: currency?.trim() || '—' },
	);

	if (!isCombo && !isService) {
		if (grain.sku?.trim()) statusRows.push({ id: 'sku', labelKey: 'sku', display: grain.sku.trim() });
		if (grain.barcode?.trim()) statusRows.push({ id: 'barcode', labelKey: 'barcode', display: grain.barcode.trim() });
	}

	const components: CatalogStatusComponentRow[] = isCombo
		? (product.combo_component_details ?? []).map((c) => ({
			product_code: c.product_code,
			product_name: c.product_name,
			variant_name: c.variant_name,
			quantity: c.quantity,
		}))
		: [];

	return {
		found: true,
		code: product.code ?? item.prod_code,
		name: product.name ?? item.prod_name,
		thumbnailUrl: product.thumbnail?.url ?? item.thumbnail?.url,
		catalogPath,
		kind,
		sellability: resolveCatalogSellability(product),
		orderedAs,
		statusRows,
		components,
	};
}
