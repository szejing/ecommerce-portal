import { defineStore } from 'pinia';
import { options_page_size } from '~/utils/options';

import type { ProductType } from '~/utils/types/product-type';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { ProductTypeCreate } from '~/utils/types/form/product-type-creation';
import type { BaseODataReq } from '~/repository/base/base.req';

type ProductTypeFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialEmptyProductType: ProductTypeCreate = {
	value: undefined,
};

const initialEmptyProductTypeFilter: ProductTypeFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const useProductTypeStore = defineStore('productTypeStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		prod_types: [] as ProductType[],
		total_prod_types: 0 as number,
		new_prod_type: structuredClone(initialEmptyProductType),
		filter: initialEmptyProductTypeFilter,
		errors: [] as string[],
	}),
	actions: {
		resetNewProductType() {
			this.new_prod_type = structuredClone(initialEmptyProductType);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.prod_types.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getProductTypes();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.prod_types.length === this.total_prod_types) {
				return;
			}

			this.getProductTypes();
		},

		async getProductTypes() {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				const { data, '@odata.count': total } = await $api.productType.getMany(queryParams);

				if (data) {
					this.prod_types = data;
					this.total_prod_types = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product type';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async addProductType(value: string) {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.productType.create({ value });

				if (data.productType) {
					successNotification(`${value} - Product Type Created !`);
					this.prod_types.push(data.productType);
				}
				this.resetNewProductType();
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product type';
				failedNotification(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateProductType(id: number, productType: ProductType) {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.productType.update(id, {
					value: productType.value,
				});

				if (data.productType) {
					successNotification(`Product Type Updated !`);
					this.getProductTypes();
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product type';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteProductType(id: number) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.productType.delete({ id });

				if (data.productType) {
					successNotification(`Product Type Deleted !`);

					const index = this.prod_types.findIndex((t) => t.id === data.productType.id);
					this.prod_types.splice(index, 1);
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product type';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
