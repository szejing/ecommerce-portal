type ProductRouteSource = {
	code?: string | null;
	slug?: string | null;
	composition?: 'single' | 'fixed_combo';
};

export function productRouteSegment(product: ProductRouteSource): string {
	return product.slug?.trim() || product.code?.trim() || '';
}

export function productDetailPath(product: ProductRouteSource): string {
	const prefix = product.composition === 'fixed_combo' ? '/products/combos' : '/products';
	return `${prefix}/${encodeURIComponent(productRouteSegment(product))}`;
}
