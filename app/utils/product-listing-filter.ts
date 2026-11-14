import type { ProductStatus } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';

export type ProductListingFilterInput = {
	status?: ProductStatus | undefined;
	type_id?: number | undefined;
};

export type ProductListingQuery = BaseODataReq & {
	type_id?: number;
};

/**
 * CRM product listing query extras.
 * `status` stays on OData `$filter`; `type_id` is a sibling query param
 * (same as GET /products/by-type) because Product has relation `type`, not `type_id`.
 */
export function buildProductListingQueryExtras(
	input: ProductListingFilterInput,
): Pick<ProductListingQuery, '$filter' | 'type_id'> {
	const extras: Pick<ProductListingQuery, '$filter' | 'type_id'> = {};
	if (input.status) {
		extras.$filter = `status eq '${input.status}'`;
	}
	if (input.type_id != null) {
		extras.type_id = input.type_id;
	}
	return extras;
}
