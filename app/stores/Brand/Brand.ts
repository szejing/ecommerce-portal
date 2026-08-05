import { options_page_size } from '~/utils/options';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { Brand } from '~/utils/types/brand';
import type { BrandCreate } from '~/utils/types/form/brand-creation';
import type { BaseODataReq } from '~/repository/base/base.req';

type BrandFilter = {
	query: string;
	current_page: number;
	page_size: number;
};

const initialEmptyBrand: BrandCreate = {
	code: '',
	description: '',
	is_active: true,
};

const initialEmptyFilter: BrandFilter = {
	query: '',
	current_page: 1,
	page_size: options_page_size[0] as number,
};

export const useBrandStore = defineStore('brandStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		new_brand: structuredClone(initialEmptyBrand),
		brands: [] as Brand[],
		total_brands: 0 as number,
		filter: initialEmptyFilter,
		errors: [] as string[],
	}),
	getters: {
		getDisplayBrands: (state) => state.brands.filter((brand) => brand.is_internal === false),
	},
	actions: {
		resetNewProductBrand() {
			this.new_brand = structuredClone(initialEmptyBrand);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.brands.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getBrands();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.brands.length === this.total_brands) {
				return;
			}

			this.getBrands();
		},

		async getBrand(code: string): Promise<Brand | undefined> {
			const { $api } = useNuxtApp();

			try {
				const data = await $api.brand.getSingle(code);

				if (data.brand) {
					return data.brand;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process brand';
				failedNotification(message);
			}
		},

		async fetchBrands(append = false) {
			const { $api } = useNuxtApp();

			try {
				const { query } = this.filter;
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
				};

				if (query) {
					queryParams.$search = query;
				}

				const { data, '@odata.count': total } = await $api.brand.getMany(queryParams);

				if (data) {
					this.brands = append ? [...this.brands, ...data] : data;
					this.total_brands = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process brand';
				failedNotification(message);
			}
		},

		async getBrands() {
			this.loading = true;

			try {
				await this.fetchBrands(false);
			} finally {
				this.loading = false;
			}
		},

		async loadMoreBrands() {
			if (this.loading || this.brands.length >= this.total_brands) return;

			this.loading = true;
			this.filter.current_page += 1;

			try {
				await this.fetchBrands(true);
			} finally {
				this.loading = false;
			}
		},

		async createBrand(): Promise<Brand> {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.brand.create({
					...this.new_brand,
				});

				if (data.brand) {
					successNotification(`${this.new_brand.code} - Brand Created !`);
					this.brands.push(data.brand);
				}

				this.new_brand = structuredClone(initialEmptyBrand);
				return data.brand;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process brand';
				failedNotification(message);
				throw new Error(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateBrand(description: string, is_active: boolean) {
			if (!this.new_brand) {
				return;
			}
			const code = this.new_brand.code;
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.brand.update(code, {
					description: description,
					is_active: is_active,
				});

				if (data.brand) {
					successNotification(`Brand ${code} Updated !`);
					this.brands = this.brands.map((brand) => {
						if (brand.code === code) {
							return data.brand;
						}
						return brand;
					});
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process brand';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteBrand(brand: Brand) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				await $api.brand.delete({ code: brand.code });

				successNotification(`Brand #${brand.code} Deleted !`);

				const index = this.brands.findIndex((t) => t.code === brand.code);
				this.brands.splice(index, 1);
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process brand';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
