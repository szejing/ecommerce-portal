import type { ProductStatus } from 'yeppi-common';
import type { ImageReq } from '../../../image/models/request/image.req';

import type { PriceInput } from '~/utils/types/price';
import type { ProductVariantInput, ComboComponent } from '~/utils/types/product';
import type { ProductVariationInput } from '~/utils/types/product-variation';

export type CreateProductReq = {
  composition?: 'single' | 'fixed_combo';
  combo_components?: ComboComponent[];
  manage_inventory?: boolean;
  allow_preorder?: boolean;
  inventory_quantity?: number;
  expected_inventory_quantity?: number;
	code?: string;
	name?: string;
	short_desc?: string;
	long_desc?: string;
	is_discountable?: boolean;
	is_giftcard?: boolean;
	is_active?: boolean;
	status?: ProductStatus;

	// Relations (using codes/IDs)
	brand_codes?: string[];
	category_codes?: string[];
	tag_ids?: number[];
	type_id?: number;

	// Images
	thumbnail?: ImageReq;
	images?: ImageReq[];

	// Nested inputs
	price_types?: PriceInput[];
	variations?: ProductVariationInput[];
	variants?: ProductVariantInput[];

	metadata?: Record<string, unknown>;
};
