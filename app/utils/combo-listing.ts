import type { ProductStatus } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';

export type ComboListingFilter = { page: number; pageSize: number; search: string; status?: ProductStatus };

export function comboListingQuery(filter: ComboListingFilter): BaseODataReq {
	return {
		$top: filter.pageSize,
		$skip: (filter.page - 1) * filter.pageSize,
		$count: true,
		$filter: `composition eq 'fixed_combo'${filter.status ? ` and status eq '${filter.status}'` : ''}`,
		$search: filter.search.trim() || undefined,
		$expand: 'price_types,thumbnail,type',
		$orderby: 'updated_at desc,code asc',
	};
}
