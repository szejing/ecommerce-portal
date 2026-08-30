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
