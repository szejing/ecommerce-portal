import { defineStore } from 'pinia';
import { options_page_size } from '~/utils/options';
import type { ProductVariationCreate } from '~/utils/types/form/product-variation-creation';
import type { ProductVariation } from '~/utils/types/product-variation';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ProductOption } from '~/utils/types/product-option';
import { defaultProductVariationRelations, type ErrorResponse } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';

type ProductVariationFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialEmptyVariation: ProductVariationCreate = {
	name: undefined,
	options: undefined,
};

const initialEmptyVariationFilter: ProductVariationFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const useProductVariationStore = defineStore('productVariationStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		prod_variations: [] as ProductVariation[],
		total_variations: 0 as number,
		new_prod_variation: structuredClone(initialEmptyVariation),
		filter: initialEmptyVariationFilter,
		errors: [] as string[],
	}),
	actions: {
		resetProdVariation() {
			this.new_prod_variation = structuredClone(initialEmptyVariation);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.prod_variations.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getProductVariations();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.prod_variations.length === this.total_variations) {
				return;
			}

			this.getProductVariations();
		},

		currentProdVariation() {
			return JSON.parse(JSON.stringify(this.prod_variations));
		},

		async getProductVariations() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$expand: filterRelations(defaultProductVariationRelations).join(','),
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				const { data, '@odata.count': total } = await $api.productVariation.getMany(queryParams);

				if (data) {
					this.prod_variations = data;
					this.total_variations = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product option';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async addProductVariation(name: string, options: string[]) {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.productVariation.create({ name, options: options.map((v) => ({ value: v })) });

				if (data.productVariation) {
					successNotification(`${name} - Product Variation Created !`);
					this.prod_variations.push(data.productVariation);
				}
				this.resetProdVariation();
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product variation';
				failedNotification(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateProductVariation(variationId: number, name: string, options: ProductOption[]) {
			this.updating = true;

			const { $api } = useNuxtApp();

			options.forEach((v) => {
				v.metadata = undefined;
			});

			try {
				const data = await $api.productVariation.update(variationId, {
					name,
					options,
				});

				if (data.productVariation) {
					successNotification(`Product Variation Updated !`);
					this.getProductVariations();
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product variation';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteProductVariation(variation: ProductVariation) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				await $api.productVariation.delete({ id: variation.id });

				successNotification(`Variation #${variation.name} Deleted !`);

				const index = this.prod_variations.findIndex((t) => t.id === variation.id);
				this.prod_variations.splice(index, 1);
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product variation';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
