import { ProductLineIdentity } from 'yeppi-common';

export const productLineIdentityItems = [
	{ value: ProductLineIdentity.CODE, label: 'Product code' },
	{ value: ProductLineIdentity.NAME, label: 'Product name' },
	{ value: ProductLineIdentity.SKU, label: 'SKU' },
] as const;

export const productLineIdentityDataSource = 'ProductLineIdentity';

export const getProductLineIdentityItems = (dataSource: string) => {
	if (dataSource === productLineIdentityDataSource) {
		return productLineIdentityItems;
	}

	return [];
};
