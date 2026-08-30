import { ProductLineIdentity, VariantLineIdentity } from 'yeppi-common';

export const LINE_IDENTITY_SEPARATOR = ' : ';

export const PRODUCT_LINE_IDENTITY_ORDER = [
	ProductLineIdentity.CODE,
	ProductLineIdentity.NAME,
	ProductLineIdentity.SKU,
] as const;

export const VARIANT_LINE_IDENTITY_ORDER = [
	VariantLineIdentity.CODE,
	VariantLineIdentity.NAME,
	VariantLineIdentity.SKU,
	VariantLineIdentity.BARCODE,
] as const;

export const PRODUCT_LINE_IDENTITY_DEFAULT = [ProductLineIdentity.CODE, ProductLineIdentity.NAME];

export const VARIANT_LINE_IDENTITY_DEFAULT = [VariantLineIdentity.CODE, VariantLineIdentity.NAME];

export type ProductLineIdentityFields = {
	prod_code?: string | null;
	prod_name?: string | null;
	prod_sku?: string | null;
};

export type VariantLineIdentityFields = {
	prod_variant_code?: string | null;
	prod_variant_name?: string | null;
	prod_variant_sku?: string | null;
	prod_variant_barcode?: string | null;
};

export function parseLineIdentitySelection(raw: string | undefined | null, fallback: readonly string[]): string[] {
	const selected = (raw ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	return selected.length > 0 ? selected : [...fallback];
}

function joinIdentityValues(
	order: readonly string[],
	selected: ReadonlySet<string>,
	values: Record<string, string | null | undefined>,
): string {
	return order
		.filter((token) => selected.has(token))
		.map((token) => values[token]?.trim() ?? '')
		.filter(Boolean)
		.join(LINE_IDENTITY_SEPARATOR);
}

export function formatProductLineIdentity(item: ProductLineIdentityFields, rawSelection?: string | null): string {
	const selected = new Set(parseLineIdentitySelection(rawSelection, PRODUCT_LINE_IDENTITY_DEFAULT));

	return joinIdentityValues(PRODUCT_LINE_IDENTITY_ORDER, selected, {
		[ProductLineIdentity.CODE]: item.prod_code,
		[ProductLineIdentity.NAME]: item.prod_name,
		[ProductLineIdentity.SKU]: item.prod_sku,
	});
}

export function formatVariantLineIdentity(item: VariantLineIdentityFields, rawSelection?: string | null): string {
	if (!item.prod_variant_code?.trim()) {
		return '';
	}

	const selected = new Set(parseLineIdentitySelection(rawSelection, VARIANT_LINE_IDENTITY_DEFAULT));

	return joinIdentityValues(VARIANT_LINE_IDENTITY_ORDER, selected, {
		[VariantLineIdentity.CODE]: item.prod_variant_code,
		[VariantLineIdentity.NAME]: item.prod_variant_name,
		[VariantLineIdentity.SKU]: item.prod_variant_sku,
		[VariantLineIdentity.BARCODE]: item.prod_variant_barcode,
	});
}
