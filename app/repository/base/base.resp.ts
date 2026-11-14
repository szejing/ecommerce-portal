/* eslint-disable @stylistic/quote-props */

export type BaseODataResp<T> = {
	'@odata.context'?: string;
	'@odata.count'?: number;
	data: T[];
	count: number;
	value: T[];
};

/** Distinct catalog types returned on CRM product listing (catalog-wide). */
export type CatalogProductType = {
	id: number;
	value: string;
};

export type ProductListingODataResp<T> = BaseODataResp<T> & {
	product_types?: CatalogProductType[];
};

export type MessageResp = {
	message: string;
};
