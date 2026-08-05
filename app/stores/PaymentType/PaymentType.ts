import type { PaymentTypeGroup } from '~/utils/types/payment-type';
import { failedNotification } from '../AppUi/AppUi';
import { options_page_size } from '~/utils/options';
import { defaultPaymentTypeGroupRelations, type ErrorResponse } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';

type PaymentTypeFilter = {
	query: string;
	currency_code: string;
	page_size: number;
	current_page: number;
};

const initialEmptyPaymentTypeFilter: PaymentTypeFilter = {
	query: '',
	currency_code: 'MYR',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const usePaymentTypeStore = defineStore('paymentTypeStore', {
	state: () => ({
		payment_type_groups: [] as PaymentTypeGroup[],
		total_payment_type_groups: 0 as number,
		filter: initialEmptyPaymentTypeFilter,
		loading: false as boolean,
		exporting: false as boolean,
	}),

	actions: {
		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.payment_type_groups.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getPaymentTypeGroups();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.payment_type_groups.length === this.total_payment_type_groups) {
				return;
			}

			this.getPaymentTypeGroups();
		},

		async getPaymentTypeGroups() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const { query, currency_code } = this.filter;

				let filter = '';

				// Add currency filter
				if (currency_code && currency_code !== 'MYR') {
					filter = `currency_code eq '${currency_code}'`;
				}

				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$expand: filterRelations(defaultPaymentTypeGroupRelations).join(','),
					$orderby: 'updated_at desc',
				};

				// Only add $filter if it's not empty
				if (filter) {
					queryParams.$filter = filter;
				}

				// Use backend $search support for text search
				if (query) {
					queryParams.$search = query;
				}

				const { data, '@odata.count': total } = await $api.paymentTypeGroup.getMany(queryParams);

				if (data) {
					this.payment_type_groups = data;
					this.total_payment_type_groups = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load payment types';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async exportPaymentTypeGroups() {
			this.exporting = true;
			// const { $api } = useNuxtApp();
			// try {
			// 	const blob = await $api.paymentTypeGroup.exportPaymentTypeGroups();
			// } catch (err: any) {
			// 	console.error(err);
			// 	failedNotification(err.message);
			// } finally {
			// 	this.exporting = false;
			// }
		},
	},
});
