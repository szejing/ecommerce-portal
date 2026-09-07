import type { ProductVariant } from '~/utils/types/product-variant';

export type OrderItemVariantSnapshot = {
	prod_variant_code: string;
	prod_variant_name?: string;
	prod_variant_sku?: string;
	prod_variant_barcode?: string;
	unit_sell_price: number;
	orig_sell_price: number;
};

/** Catalog unit sell price: sale_price when set, otherwise orig_sell_price. */
export function resolveCatalogVariantSellPrice(variant: ProductVariant): number | undefined {
	const priceType = variant.price_types?.[0];
	if (!priceType) {
		return undefined;
	}

	const sell = priceType.sale_price ?? priceType.orig_sell_price;
	if (sell == null || Number.isNaN(Number(sell))) {
		return undefined;
	}

	return Number(sell);
}

/**
 * Maps a catalog variant onto order-line identity + price fields.
 * Returns undefined when the variant has no usable catalog price (caller should block the swap).
 */
export function mapCatalogVariantToOrderItemFields(variant: ProductVariant): OrderItemVariantSnapshot | undefined {
	const unit_sell_price = resolveCatalogVariantSellPrice(variant);
	if (unit_sell_price == null) {
		return undefined;
	}

	const origRaw = variant.price_types?.[0]?.orig_sell_price;
	const orig_sell_price = origRaw == null || Number.isNaN(Number(origRaw)) ? unit_sell_price : Number(origRaw);

	return {
		prod_variant_code: variant.variant_code,
		prod_variant_name: variant.name,
		prod_variant_sku: variant.sku,
		prod_variant_barcode: variant.barcode,
		unit_sell_price,
		orig_sell_price,
	};
}
