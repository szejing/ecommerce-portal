import { LineType } from 'yeppi-common';

type ProductRouteSource = {
	code?: string | null;
	slug?: string | null;
	composition?: 'single' | 'fixed_combo';
};

type OrderItemRouteSource = {
	prod_code?: string | null;
	line_type?: LineType | string | null;
};

export function productRouteSegment(product: ProductRouteSource): string {
	return product.slug?.trim() || product.code?.trim() || '';
}

export function productDetailPath(product: ProductRouteSource): string {
	const prefix = product.composition === 'fixed_combo' ? '/products/combos' : '/products';
	return `${prefix}/${encodeURIComponent(productRouteSegment(product))}`;
}

/** Catalog detail path for an order/sale line; null when prod_code is missing. */
export function orderItemDetailPath(item: OrderItemRouteSource): string | null {
	const code = item.prod_code?.trim();
	if (!code) return null;

	return productDetailPath({
		code,
		composition: item.line_type === LineType.COMBO_HEADER ? 'fixed_combo' : undefined,
	});
}
