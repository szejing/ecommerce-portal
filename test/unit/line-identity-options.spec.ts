import { ProductLineIdentity, VariantLineIdentity } from 'yeppi-common';
import { describe, expect, it } from 'vitest';
import { getProductLineIdentityItems } from '../../app/utils/options/product-line-identity';
import { getVariantLineIdentityItems } from '../../app/utils/options/variant-line-identity';

describe('line identity setting options', () => {
	it('returns Product Line Identity tokens for that data source only', () => {
		expect(getProductLineIdentityItems('ProductLineIdentity').map((item) => item.value)).toEqual([
			ProductLineIdentity.CODE,
			ProductLineIdentity.NAME,
			ProductLineIdentity.SKU,
		]);
		expect(getProductLineIdentityItems('VariantLineIdentity')).toEqual([]);
	});

	it('returns Variant Line Identity tokens including barcode', () => {
		expect(getVariantLineIdentityItems('VariantLineIdentity').map((item) => item.value)).toEqual([
			VariantLineIdentity.CODE,
			VariantLineIdentity.NAME,
			VariantLineIdentity.SKU,
			VariantLineIdentity.BARCODE,
		]);
		expect(getVariantLineIdentityItems('ProductLineIdentity')).toEqual([]);
	});
});
