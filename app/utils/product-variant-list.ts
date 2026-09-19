import type { ProductOptionInput } from '~/utils/types/product-option';
import type { ProductVariationInput } from '~/utils/types/product-variation';

/** Variations with at least one non-empty option value (name is optional). */
export function getValidProductVariations(variations: ProductVariationInput[] | undefined): ProductVariationInput[] {
	return (variations ?? []).filter((variation) => variation.options.some((option) => option.value.trim() !== ''));
}

export function getValidProductOptions(variation: ProductVariationInput): ProductOptionInput[] {
	return variation.options.filter((option) => option.value.trim() !== '');
}

export function resolveProductVariationId(variation: ProductVariationInput, option?: ProductOptionInput): number | undefined {
	return variation.id ?? option?.variation_id ?? variation.options.find((o) => o.variation_id != null)?.variation_id;
}

export function normalizeVariantSku(sku: string | null | undefined): string | undefined {
	const trimmed = sku?.trim();
	return trimmed ? trimmed : undefined;
}

/** Indexes of Variants that share a non-empty SKU with another Variant on the same Product. */
export function duplicateVariantSkuIndexes(variants: Array<{ sku?: string | null | undefined }>): number[] {
	const bySku = new Map<string, number[]>();
	variants.forEach((variant, index) => {
		const sku = normalizeVariantSku(variant.sku);
		if (!sku) return;
		const list = bySku.get(sku) ?? [];
		list.push(index);
		bySku.set(sku, list);
	});

	const duplicates: number[] = [];
	for (const indexes of bySku.values()) {
		if (indexes.length > 1) duplicates.push(...indexes);
	}
	return duplicates.sort((a, b) => a - b);
}

export function isDuplicateVariantSku(sku: string | null | undefined, otherSkus: Array<string | null | undefined>): boolean {
	const normalized = normalizeVariantSku(sku);
	if (!normalized) return false;
	return otherSkus.some((other) => normalizeVariantSku(other) === normalized);
}

/** Empty or zero is off. Sale Price is only on when greater than zero. */
export function normalizeSalePrice(value: number | string | null | undefined): number | undefined {
	if (value === '' || value == null) return undefined;
	const n = typeof value === 'string' ? Number.parseFloat(value) : value;
	if (!Number.isFinite(n) || n <= 0) return undefined;
	return n;
}

function isFilledApplyValue(value: number | string | null | undefined): boolean {
	return value !== undefined && value !== null && value !== '';
}

type VariantPriceApplyTarget = {
	price_types?: Array<{ orig_sell_price?: number; sale_price?: number | null }>;
};

/** Apply only filled Apply-to-all inputs. Sale Price of 0 is treated as blank and skipped. */
export function applyVariantListPricesToAll(
	variants: VariantPriceApplyTarget[],
	orig: number | string | null | undefined,
	sale: number | string | null | undefined,
): void {
	const applyOrig = isFilledApplyValue(orig);
	const parsedOrig = applyOrig ? Number(orig) : undefined;
	const saleToApply = isFilledApplyValue(sale) ? normalizeSalePrice(sale) : undefined;

	for (const variant of variants) {
		const priceType = variant.price_types?.[0];
		if (!priceType) continue;
		if (applyOrig && parsedOrig != null && Number.isFinite(parsedOrig)) {
			priceType.orig_sell_price = parsedOrig;
		}
		if (saleToApply !== undefined) {
			priceType.sale_price = saleToApply;
		}
	}
}

type VariantInventoryApplyTarget = {
	manage_inventory?: boolean;
	allow_preorder?: boolean;
	inventory_quantity?: number;
};

/**
 * Apply-to-all inventory: Manage / Allow always overwrite.
 * Manage off forces Allow off and leaves On Hand untouched.
 * Manage on: blank On Hand skips; filled (incl. 0) writes.
 */
export function applyVariantListInventoryToAll(
	variants: VariantInventoryApplyTarget[],
	manageInventory: boolean,
	allowPreorder: boolean,
	quantity: number | string | null | undefined,
): void {
	const manage = !!manageInventory;
	const allow = manage && !!allowPreorder;
	const applyQty = manage && isFilledApplyValue(quantity);
	const parsedQty = applyQty ? Number(quantity) : undefined;

	for (const variant of variants) {
		variant.manage_inventory = manage;
		variant.allow_preorder = allow;
		if (applyQty && parsedQty != null && Number.isFinite(parsedQty)) {
			variant.inventory_quantity = parsedQty;
		}
	}
}

export type VariantDetailPayload = {
	sku?: string;
	barcode?: string;
	orig_sell_price?: number;
	sale_price?: number;
	cost_price?: number;
	manage_inventory?: boolean;
	allow_preorder?: boolean;
	inventory_quantity?: number;
};

type VariantDetailTarget = {
	sku?: string;
	barcode?: string;
	manage_inventory?: boolean;
	allow_preorder?: boolean;
	inventory_quantity?: number;
	price_types?: Array<{
		orig_sell_price?: number;
		sale_price?: number | null;
		cost_price?: number;
		currency_code?: string;
	}>;
};

/** Merge confirmed detail-modal fields onto a variant row (prices + inventory). */
export function applyVariantDetailPayload(variant: VariantDetailTarget, payload: VariantDetailPayload): void {
	variant.sku = payload.sku;
	variant.barcode = payload.barcode;
	variant.manage_inventory = payload.manage_inventory;
	variant.allow_preorder = payload.allow_preorder;
	variant.inventory_quantity = payload.inventory_quantity;

	if (!variant.price_types?.[0]) {
		variant.price_types = [{ orig_sell_price: 0, currency_code: 'MYR' }];
	}
	const priceType = variant.price_types[0]!;
	if (payload.orig_sell_price != null && Number.isFinite(payload.orig_sell_price)) {
		priceType.orig_sell_price = payload.orig_sell_price;
	}
	priceType.sale_price = normalizeSalePrice(payload.sale_price);
	priceType.cost_price = payload.cost_price;
}

export type ProductInventoryFields = {
	manage_inventory: boolean;
	allow_preorder: boolean;
	inventory_quantity: number;
};

export type ApplyAllInventoryReflection = {
	manage_inventory: boolean;
	allow_preorder: boolean;
	inventory_quantity: number | undefined;
	manage_indeterminate: boolean;
	allow_indeterminate: boolean;
};

/** Reflect common Variant inventory into the Apply-to-all bar; mixed → indeterminate / empty qty. */
export function resolveApplyAllInventoryFromVariants(
	variants: VariantInventoryApplyTarget[],
): ApplyAllInventoryReflection {
	if (!variants.length) {
		return {
			manage_inventory: false,
			allow_preorder: false,
			inventory_quantity: undefined,
			manage_indeterminate: false,
			allow_indeterminate: false,
		};
	}

	const manageValues = variants.map((v) => !!v.manage_inventory);
	const manageAllTrue = manageValues.every(Boolean);
	const manageAllFalse = manageValues.every((v) => !v);
	const manage_indeterminate = !manageAllTrue && !manageAllFalse;

	const allowValues = variants.map((v) => !!v.allow_preorder);
	const allowAllTrue = allowValues.every(Boolean);
	const allowAllFalse = allowValues.every((v) => !v);
	const allow_indeterminate = manageAllTrue && !allowAllTrue && !allowAllFalse;

	let inventory_quantity: number | undefined;
	if (manageAllTrue) {
		const qtys = variants.map((v) => Number(v.inventory_quantity ?? 0));
		const first = qtys[0];
		inventory_quantity = qtys.every((q) => q === first) ? first : undefined;
	}

	return {
		manage_inventory: manageAllTrue,
		allow_preorder: manageAllTrue && allowAllTrue,
		inventory_quantity,
		manage_indeterminate,
		allow_indeterminate,
	};
}

const ROW_CLICK_BLOCKING_SELECTOR = 'input, textarea, select, button, a, label, [role="checkbox"], [role="button"], [contenteditable="true"]';

/** Whole-row opens Detail only when the click did not start on an interactive control. */
export function shouldOpenVariantDetailFromRowClick(target: EventTarget | null): boolean {
	if (!target || typeof (target as Element).closest !== 'function') return false;
	return !(target as Element).closest(ROW_CLICK_BLOCKING_SELECTOR);
}

export function clearedProductInventory(): ProductInventoryFields {
	return {
		manage_inventory: false,
		allow_preorder: false,
		inventory_quantity: 0,
	};
}

type RankedInventoryVariant = VariantInventoryApplyTarget & {
	variant_rank?: number | null;
};

/** Lowest variant_rank wins; ties keep first occurrence. */
export function productInventoryFromFirstVariant(variants: RankedInventoryVariant[]): ProductInventoryFields {
	if (!variants.length) return clearedProductInventory();

	const sorted = [...variants].sort((a, b) => (a.variant_rank ?? 0) - (b.variant_rank ?? 0));
	const first = sorted[0]!;
	const manage = !!first.manage_inventory;
	return {
		manage_inventory: manage,
		allow_preorder: manage && !!first.allow_preorder,
		inventory_quantity: manage ? Number(first.inventory_quantity ?? 0) : 0,
	};
}

export function seedVariantInventoryFromProduct(
	variants: VariantInventoryApplyTarget[],
	product: Partial<ProductInventoryFields>,
): void {
	const manage = !!product.manage_inventory;
	const allow = manage && !!product.allow_preorder;
	const qty = manage ? Number(product.inventory_quantity ?? 0) : 0;

	for (const variant of variants) {
		variant.manage_inventory = manage;
		variant.allow_preorder = allow;
		variant.inventory_quantity = qty;
	}
}
