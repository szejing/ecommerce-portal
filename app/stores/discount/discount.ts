import { options_page_size } from '~/utils/options';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { CreateDiscountReq } from '~/repository/modules/discount/models/request/create-discount.req';
import type { UpdateDiscountReq } from '~/repository/modules/discount/models/request/update-discount.req';
import { AllocationType, defaultDiscountRelations, DiscountType, removeDuplicateExpands, type ErrorResponse } from 'yeppi-common';
import type { Discount } from '~/utils/types/discount';
import type { DiscountCreate } from '~/utils/types/form/discount-creation';

type DiscountFilter = {
	query: string;
	page_size: number;
	current_page: number;
	status?: string;
};

const initialDiscountFilter: DiscountFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
	status: undefined,
};

const initialEmptyDiscount: DiscountCreate = {
	code: '',
	description: '',
	is_disabled: false,
	usage_limit: undefined,
	starts_at: undefined,
	ends_at: undefined,
	disc_type: DiscountType.PERCENTAGE,
	disc_value: 10,
	allocation: AllocationType.BILL,
	min_order_amt: undefined,
	max_disc_amt: undefined,
	conditions: [],
};

export const useDiscountStore = defineStore('discountStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		filter: structuredClone(initialDiscountFilter),
		discounts: [] as Discount[],
		total_discounts: 0 as number,
		current_discount: undefined as Discount | undefined,
		new_discount: structuredClone(initialEmptyDiscount),
	}),
	actions: {
		resetNewDiscount() {
			this.new_discount = structuredClone(initialEmptyDiscount);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.discounts.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getDiscounts();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.discounts.length === this.total_discounts) {
				return;
			}

			this.getDiscounts();
		},

		async getDiscounts() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$expand: removeDuplicateExpands(defaultDiscountRelations).join(','),
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				if (this.filter.status === 'active') {
					queryParams.$filter = 'is_disabled eq false';
				} else if (this.filter.status === 'inactive') {
					queryParams.$filter = 'is_disabled eq true';
				}

				const response = await $api.discount.getMany(queryParams);

				if (response.data) {
					this.discounts = response.data;
					this.total_discounts = response['@odata.count'] ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process discount';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getDiscountByCode(code: string): Promise<Discount | undefined> {
			const { $api } = useNuxtApp();
			try {
				const data = await $api.discount.getSingle(code);
				if (data.discount) {
					return data.discount;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process discount';
				failedNotification(message);
			}
		},

		/** Load discounts for pickers (e.g. voucher form) without changing listing filter/state. */
		async fetchDiscountsForSelect(): Promise<Discount[]> {
			const { $api } = useNuxtApp();
			try {
				const response = await $api.discount.getMany({
					$top: 500,
					$skip: 0,
					$orderby: 'code asc',
				});
				return response.data ?? [];
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load discounts';
				failedNotification(message);
				return [];
			}
		},

		async createDiscount(payload: CreateDiscountReq) {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.discount.create(payload);

				if (data.code) {
					successNotification(`${data.code} - Discount Created !`);
					this.discounts.unshift(data);
				}
				this.resetNewDiscount();
				return data;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create discount';
				failedNotification(message);
				throw err;
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateStatus(discount: Discount, active: boolean) {
			await this.updateDiscount(discount.code, { is_disabled: !active });
		},

		async updateDiscount(code: string, payload: UpdateDiscountReq) {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.discount.update(code, payload);

				if (data.discount.code) {
					successNotification(`${data.discount.code} - Discount Updated !`);
					this.getDiscounts();
				}
				return data;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to update discount';
				failedNotification(message);
				throw err;
			} finally {
				this.updating = false;
			}
		},

		async deleteDiscount(code: string) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.discount.remove({ code });

				if (data.discount.code) {
					successNotification(`Discount #${data.discount.code} Deleted !`);

					const index = this.discounts.findIndex((d) => d.code === data.discount.code);
					if (index !== -1) {
						this.discounts.splice(index, 1);
					}
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete discount';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
