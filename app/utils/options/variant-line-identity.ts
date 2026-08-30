import { VariantLineIdentity } from 'yeppi-common';

export const variantLineIdentityItems = [
	{ value: VariantLineIdentity.CODE, label: 'Variant code' },
	{ value: VariantLineIdentity.NAME, label: 'Variant name' },
	{ value: VariantLineIdentity.SKU, label: 'SKU' },
	{ value: VariantLineIdentity.BARCODE, label: 'Barcode' },
] as const;

export const variantLineIdentityDataSource = 'VariantLineIdentity';

export const getVariantLineIdentityItems = (dataSource: string) => {
	if (dataSource === variantLineIdentityDataSource) {
		return variantLineIdentityItems;
	}

	return [];
};
