import type { ProductOption, ProductOptionInput } from './product-option';
import type { Price, PriceInput } from './price';

// Input type for create/update operations
export type ProductVariantInput = {
	variant_code?: string;
	product_code?: string;
	name?: string;
	short_desc?: string;
	sku?: string;
	ean?: string;
	upc?: string;
	barcode?: string;
	hs_code?: string;
	inventory_quantity?: number;
	allow_preorder?: boolean;
	manage_inventory?: boolean;
	weight?: number;
	length?: number;
	height?: number;
	width?: number;
	origin_country?: string;
	material?: string;
	price_types?: PriceInput[];
	options?: ProductOptionInput[];
	metadata?: Record<string, unknown>;
};

// Model type for display/read operations
export type ProductVariant = {
	variant_code: string;
	product_code?: string;
	name?: string;
	short_desc?: string;
	sku?: string;
	ean?: string;
	upc?: string;
	barcode?: string;
	hs_code?: string;
	inventory_quantity?: number;
	allow_preorder?: boolean;
	manage_inventory?: boolean;
	weight?: number;
	length?: number;
	height?: number;
	width?: number;
	origin_country?: string;
	material?: string;
	price_types?: Price[];
	options?: ProductOption[];
	metadata?: Record<string, unknown>;
	created_at?: string;
	updated_at?: string;
};
