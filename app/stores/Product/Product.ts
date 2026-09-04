import { defineStore } from 'pinia';
import { getFormattedDate, ProductStatus, type ErrorResponse } from 'yeppi-common';
import { options_page_size } from '~/utils/options';
import type { Product } from '~/utils/types/product';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ProductCreate, ProductUpdate } from '~/utils/types/form/product-creation';
import { dir } from '~/utils/constants/dir';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { ImageReq } from '~/repository/modules/image/models/request/image.req';
import type { ProductImportResp, ProductImportTemplateType } from '~/repository/modules/product/product';
import { resolveProductImportSummary } from '~/utils/product-import-feedback';

export const PRODUCT_FILTER_DEBOUNCE_MS = 500;

const PRODUCT_LISTING_EXPAND = ['price_types', 'thumbnail', 'type', 'variants'] as const;

export type ProductFailure = { kind: 'request_failed'; message: string };
export type ProductRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: ProductFailure };
export type ProductMutationOutcome =
	| { status: 'completed'; product: Product }
	| { status: 'failed'; failure: ProductFailure };

let productFilterTimer: ReturnType<typeof setTimeout> | undefined;

type ProductFilter = {
	query: string;
	status: ProductStatus | undefined;
	page_size: number;
	current_page: number;
};

const initialEmptyProductFilter: ProductFilter = {
	query: '',
	status: undefined,
	page_size: options_page_size[0] as number,
	current_page: 1,
};

const initialEmptyProduct: ProductCreate = {
	code: undefined,
	name: '',
	short_desc: undefined,
	long_desc: undefined,
	is_active: true,
	is_discountable: true,
	is_giftcard: false,

	status: ProductStatus.DRAFT,

	// product types
	type_id: 1,

	// categories
	category_codes: [],

	// brands
	brand_codes: [],

	// tags
	tag_ids: [],

	// thumbnail
	thumbnail: undefined,

	// images
	images: undefined,

	// price
	price_types: [
		{
			id: undefined,
			currency_code: 'MYR',
			orig_sell_price: 0,
			cost_price: undefined,
			sale_price: undefined,
		},
	],

	// variants
	variations: [],
	variants: [],

	// metadata
	metadata: undefined,
};

export const useProductStore = defineStore('productStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		importing: false as boolean,
		downloading_template: false as boolean,
		new_product: structuredClone(initialEmptyProduct),
		products: [] as Product[],
		total_products: 0 as number,
		current_product: undefined as Product | undefined,
		filter: structuredClone(initialEmptyProductFilter),
		errors: [] as string[],
		listFailure: undefined as ProductFailure | undefined,
		listingGeneration: 0 as number,
	}),

	getters: {
		filters: (state) => ({ ...state.filter }),
	},

	actions: {
		resetNewProduct() {
			this.new_product = structuredClone(initialEmptyProduct);
		},

		setSearch(search: string) {
			this.filter.query = search;
			this.filter.current_page = 1;
			if (productFilterTimer) clearTimeout(productFilterTimer);
			productFilterTimer = setTimeout(() => {
				productFilterTimer = undefined;
				void this.refreshListing();
			}, PRODUCT_FILTER_DEBOUNCE_MS);
		},

		setStatus(status: ProductStatus | undefined) {
			this.filter.status = status;
			this.filter.current_page = 1;
			void this.refreshListing();
		},

		async setPage(page: number): Promise<ProductRefreshOutcome> {
			this.filter.current_page = page;
			return this.refreshListing();
		},

		async setPageSize(size: number): Promise<ProductRefreshOutcome> {
			this.filter.page_size = size;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async clearFilters(): Promise<ProductRefreshOutcome> {
			if (productFilterTimer) clearTimeout(productFilterTimer);
			productFilterTimer = undefined;
			this.filter.query = '';
			this.filter.status = undefined;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async refreshListing(): Promise<ProductRefreshOutcome> {
			const generation = ++this.listingGeneration;
			this.loading = true;
			this.listFailure = undefined;
			const { $api } = useNuxtApp();
			try {
				const { query, status } = this.filter;
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$expand: PRODUCT_LISTING_EXPAND.join(','),
					$orderby: 'updated_at desc',
				};
				if (status) queryParams.$filter = `status eq '${status}'`;
				if (query.trim()) queryParams.$search = query.trim();
				const resp = await $api.product.getMany(queryParams);
				if (generation !== this.listingGeneration) return { status: 'stale' };
				const items = resp.data ?? resp.value ?? [];
				const total = resp['@odata.count'] ?? resp.count ?? 0;
				this.products = Array.isArray(items) ? items : [];
				this.total_products = typeof total === 'number' ? total : 0;
				return { status: 'completed' };
			} catch (err: unknown | ErrorResponse) {
				if (generation !== this.listingGeneration) return { status: 'stale' };
				const failure = { kind: 'request_failed' as const, message: (err as ErrorResponse).message ?? 'Failed to process product' };
				this.listFailure = failure;
				return { status: 'failed', failure };
			} finally {
				if (generation === this.listingGeneration) this.loading = false;
			}
		},

		async updatePageSize(size: number) {
			await this.setPageSize(size);
		},

		async updatePage(page: number) {
			await this.setPage(page);
		},

		async getProduct(code: string): Promise<Product | undefined> {
			const { $api } = useNuxtApp();

			try {
				const data = await $api.product.getSingle(code);

				if (data.product) {
					return data.product;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product';
				failedNotification(message);
			}
		},

		async getProductBySlug(slug: string): Promise<Product | undefined> {
			const { $api } = useNuxtApp();

			try {
				const data = await $api.product.getSingleBySlug(slug);

				if (data.product) {
					return data.product;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product';
				failedNotification(message);
			}
		},

		async getProducts(): Promise<ProductRefreshOutcome> {
			return this.refreshListing();
		},

		async persistNewProduct(): Promise<ProductMutationOutcome> {
			this.adding = true;
			const { $api } = useNuxtApp();
			try {
				let images: ImageReq[] = [];
				if (this.new_product.images) {
					const resp = await $api.image.uploadMultiple(this.new_product.images as File[], `${dir.products}/${this.new_product.code}`, 'product-gallery');
					images = resp.images.map((image) => ({
						id: image.id,
						url: image.url,
					}));
				}

				let thumbnail: ImageReq | undefined;
				if (this.new_product.thumbnail) {
					const resp = await $api.image.upload(this.new_product.thumbnail as File, `${dir.products}/${this.new_product.code}`, 'product-thumbnail');
					thumbnail = {
						id: resp.image.id,
						url: resp.image.url,
					};
				}

				const data = await $api.product.create({
					...this.new_product,
					images,
					thumbnail,
				});
				this.resetNewProduct();
				return { status: 'completed', product: data.product };
			} catch (err: unknown | ErrorResponse) {
				const failure = { kind: 'request_failed' as const, message: (err as ErrorResponse).message ?? 'Failed to process product' };
				return { status: 'failed', failure };
			} finally {
				this.adding = false;
			}
		},

		async saveNewDraft(): Promise<ProductMutationOutcome> {
			this.new_product.status = ProductStatus.DRAFT;
			this.new_product.is_active = false;
			return this.persistNewProduct();
		},

		async publishNewProduct(): Promise<ProductMutationOutcome> {
			this.new_product.status = ProductStatus.PUBLISHED;
			this.new_product.is_active = true;
			return this.persistNewProduct();
		},

		async createProduct(): Promise<Product | undefined> {
			const outcome = await this.publishNewProduct();
			if (outcome.status === 'completed') return outcome.product;
		},

		async updateStatus(product: Product, is_active: boolean) {
			await this.updateProduct({ code: product.code as string, is_active });
		},

		async updateProduct(product: Partial<ProductUpdate> & { code: string }) {
			const code = product.code;
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				// Only resolve images when provided (partial update)
				let images: ImageReq[] | undefined;
				if (product.images !== undefined) {
					images = [];
					if (product.images.length > 0) {
						for (const [index, image] of product.images.entries()) {
							if (image instanceof File) {
								const resp = await $api.image.upload(image, `${dir.products}/${code}`, 'product-gallery', index + 1);
								images.push({ id: resp.image.id, url: resp.image.url });
							} else {
								images.push({ id: image.id, url: image.url });
							}
						}
					}
				}

				// Only resolve thumbnail when provided (partial update)
				let thumbnail: ImageReq | undefined;
				if (product.thumbnail !== undefined) {
					if (product.thumbnail) {
						if (product.thumbnail instanceof File) {
							const resp = await $api.image.upload(product.thumbnail, `${dir.products}/${code}`, 'product-thumbnail');
							thumbnail = {
								id: resp.image.id,
								url: resp.image.url,
							};
						} else {
							thumbnail = {
								id: product.thumbnail.id,
								url: product.thumbnail.url,
							};
						}
					} else {
						thumbnail = undefined;
					}
				}

				// Build payload with only defined fields (partial update: omit = no change)
				const body: Record<string, unknown> = {};
				if (product.slug !== undefined) body.slug = product.slug;
				if (product.name !== undefined) body.name = product.name;
				if (product.short_desc !== undefined) body.short_desc = product.short_desc;
				if (product.long_desc !== undefined) body.long_desc = product.long_desc;
				if (product.is_active !== undefined) body.is_active = product.is_active;
				if (product.is_discountable !== undefined) body.is_discountable = product.is_discountable;
				if (product.is_giftcard !== undefined) body.is_giftcard = product.is_giftcard;
				if (product.status !== undefined) body.status = product.status;
				if (product.type_id !== undefined) body.type_id = product.type_id;
				if (product.metadata !== undefined) body.metadata = product.metadata;
				if (product.tag_ids !== undefined) body.tag_ids = product.tag_ids;
				if (product.brand_codes !== undefined) body.brand_codes = product.brand_codes;
				if (product.category_codes !== undefined) body.category_codes = product.category_codes;
				if (product.price_types !== undefined) body.price_types = product.price_types;
				if (product.variations !== undefined) body.variations = product.variations;
				if (product.variants !== undefined) body.variants = product.variants;
				if (thumbnail !== undefined) body.thumbnail = thumbnail;
				if (images !== undefined) body.images = images;

				const data = await $api.product.update(code, body);

				if (data.product) {
					successNotification(`Product ${code} Updated !`);
					this.products = this.products.map((p) => {
						if (p.code === code) {
							return data.product;
						}
						return p;
					});
				}

				return true;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteProduct(code: string) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.product.delete({ code });

				if (data.product) {
					successNotification(`Product #${data.product.code} Deleted !`);

					const index = this.products.findIndex((t) => t.code === data.product.code);
					this.products.splice(index, 1);
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async deleteVariant(code: string, variant_code: string) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.product.deleteVariant(code, variant_code);

				if (data.product) {
					successNotification(`Variant #${variant_code} Deleted !`);

					this.products = this.products.map((product) => {
						if (product.code === code) {
							return data.product;
						}
						return product;
					});
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process product';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async importProducts(file: File, templateType: ProductImportTemplateType = 'wemotoo'): Promise<ProductImportResp> {
			this.importing = true;

			const { $api, $i18n } = useNuxtApp();

			try {
				const result = await $api.product.importProducts(file, templateType);
				const summary = resolveProductImportSummary(result, $i18n.t);

				if (summary.failed) {
					failedNotification(summary.message);
				} else {
					successNotification(summary.message);
				}

				await this.getProducts();
				return result;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? (err instanceof Error ? err.message : 'Failed to import products');
				failedNotification(message);
				throw new Error(message);
			} finally {
				this.importing = false;
			}
		},

		async downloadImportTemplate() {
			const { $api } = useNuxtApp();
			this.downloading_template = true;

			try {
				const blob = await $api.product.downloadImportTemplate();
				const url = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.download = `product_import_template_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(url);
				successNotification('Product import template downloaded');
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to download product import template';
				failedNotification(message);
			} finally {
				this.downloading_template = false;
			}
		},

		async exportProducts() {
			// this.exporting = true;
			// const { $api } = useNuxtApp();
			// try {
			// 	const data = await $api.product.exportProducts();
			// } catch (err: any) {
			// 	console.error(err);
			// 	failedNotification(err.message);
			// } finally {
			// 	this.exporting = false;
			// }
		},
	},
});
