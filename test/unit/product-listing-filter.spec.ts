import { describe, expect, it } from 'vitest';
import { ProductStatus } from 'yeppi-common';
import { buildProductListingQueryExtras } from '../../app/utils/product-listing-filter';

describe('buildProductListingQueryExtras', () => {
	it('returns empty extras when nothing is selected', () => {
		expect(buildProductListingQueryExtras({})).toEqual({});
		expect(buildProductListingQueryExtras({ status: undefined, type_id: undefined })).toEqual({});
	});

	it('sends type_id as a query param (not $filter)', () => {
		expect(buildProductListingQueryExtras({ type_id: 2 })).toEqual({ type_id: 2 });
	});

	it('filters by status alone via $filter', () => {
		expect(buildProductListingQueryExtras({ status: ProductStatus.DRAFT })).toEqual({
			$filter: `status eq '${ProductStatus.DRAFT}'`,
		});
	});

	it('combines type_id query param with status $filter', () => {
		expect(buildProductListingQueryExtras({ type_id: 1, status: ProductStatus.PUBLISHED })).toEqual({
			type_id: 1,
			$filter: `status eq '${ProductStatus.PUBLISHED}'`,
		});
	});
});
