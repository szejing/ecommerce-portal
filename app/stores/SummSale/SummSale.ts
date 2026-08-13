import { defineStore } from 'pinia';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import { getFormattedDate, OrderStatus, type ErrorResponse } from 'yeppi-common';
import { initialEmptySaleSumm } from './models/sale-summ.model';
import { initialEmptySaleSummItem } from './models/sale-summ-items.model';
import { initialEmptySaleSummPayment } from './models/sale-summ-payments.model';
import { initialEmptySaleSummCustomer } from './models/sale-summ-customer.model';
import type { Range } from '~/utils/interface';
import type { SummDaily_, SummCustomer_, SummProduct_, TotalSaleAmt_ } from '~/repository/modules/summ-sale/models/response/get-dashboard-summ.resp';
import { sub } from 'date-fns';

export type SummSaleFailure = { kind: 'request_failed'; message: string } | { kind: 'export_empty' };
export type SummSaleRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: Extract<SummSaleFailure, { kind: 'request_failed' }> };
export type SummSaleExportOutcome =
	| { status: 'completed' }
	| { status: 'failed'; failure: SummSaleFailure };

const VALID_ORDER_STATUSES = new Set(Object.values(OrderStatus));

const defaultSummDateRange = (): Range => ({
	start: sub(new Date(), { days: 14 }),
	end: new Date(),
});

const buildSummSaleBillFilter = (filter: { status?: OrderStatus; currency_code: string; date_range: Range }): string => {
	const clauses: string[] = [];
	if (filter.status) clauses.push(`status eq '${filter.status}'`);
	if (filter.currency_code) clauses.push(`currency_code eq '${filter.currency_code}'`);
	if (filter.date_range.end) {
		clauses.push(
			`(biz_date between '${getFormattedDate(filter.date_range.start!, 'yyyy-MM-dd')}' and '${getFormattedDate(filter.date_range.end, 'yyyy-MM-dd')}')`,
		);
	} else if (filter.date_range.start) {
		clauses.push(`biz_date le '${getFormattedDate(filter.date_range.start, 'yyyy-MM-dd')}'`);
	}
	return clauses.join(' and ');
};

export const useSummSaleStore = defineStore('summSaleStore', {
	state: () => ({
		loading: false as boolean,
		errors: [] as string[],
		daily_summaries: [] as SummDaily_[],
		top_purchased_customers: [] as SummCustomer_[],
		top_purchased_products: [] as SummProduct_[],
		total_sale_amt: [] as TotalSaleAmt_[],
		sale_summ: structuredClone(initialEmptySaleSumm),
		sale_summ_items: structuredClone(initialEmptySaleSummItem),
		sale_summ_payments: structuredClone(initialEmptySaleSummPayment),
		sale_summ_customer: structuredClone(initialEmptySaleSummCustomer),
		listFailure: undefined as Extract<SummSaleFailure, { kind: 'request_failed' }> | undefined,
		listingGeneration: 0 as number,
	}),
	getters: {
		filters: (state) => ({
			dateRange: { ...state.sale_summ.filter.date_range },
			status: state.sale_summ.filter.status,
			currencyCode: state.sale_summ.filter.currency_code,
			page: state.sale_summ.current_page,
			pageSize: state.sale_summ.page_size,
		}),
	},
	actions: {
		async getDashboardSummary(range?: Range) {
			this.loading = true;
			const { $api } = useNuxtApp();

			let { start, end } = range ?? { start: undefined, end: undefined };

			if (end == undefined) {
				end = new Date();
				end.setHours(0, 0, 0, 0);
			}

			if (start == undefined) {
				start = new Date(end);
				start.setDate(start.getDate() - 7);
			}

			try {
				const data = await $api.summSales.getDashboardSalesSummary({
					start_date: getFormattedDate(start!),
					end_date: getFormattedDate(end!),
				});

				if (data.daily_summaries) {
					this.daily_summaries = data.daily_summaries;
				}

				if (data.top_purchased_customers) {
					this.top_purchased_customers = data.top_purchased_customers;
				}

				if (data.top_purchased_products) {
					this.top_purchased_products = data.top_purchased_products;
				}

				if (data.total_sale_amt) {
					this.total_sale_amt = data.total_sale_amt;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		hydrateFromQuery(query: Record<string, unknown>) {
			const start = typeof query.start_date === 'string' ? new Date(query.start_date) : undefined;
			const end = typeof query.end_date === 'string' ? new Date(query.end_date) : undefined;
			if (start && !Number.isNaN(start.getTime())) this.sale_summ.filter.date_range.start = start;
			if (end && !Number.isNaN(end.getTime())) this.sale_summ.filter.date_range.end = end;
			if (typeof query.status === 'string' && VALID_ORDER_STATUSES.has(query.status as OrderStatus)) {
				this.sale_summ.filter.status = query.status as OrderStatus;
			}
		},

		async setDateRange(range: Range): Promise<SummSaleRefreshOutcome> {
			this.sale_summ.filter.date_range = {
				start: range.start ? new Date(range.start) : new Date(),
				end: range.end ? new Date(range.end) : undefined,
			};
			this.sale_summ.current_page = 1;
			return this.refreshListing();
		},

		async setStatus(status: OrderStatus | undefined): Promise<SummSaleRefreshOutcome> {
			this.sale_summ.filter.status = status;
			this.sale_summ.current_page = 1;
			return this.refreshListing();
		},

		async setPage(page: number): Promise<SummSaleRefreshOutcome> {
			this.sale_summ.current_page = page;
			return this.refreshListing();
		},

		async setPageSize(size: number): Promise<SummSaleRefreshOutcome> {
			this.sale_summ.page_size = size;
			this.sale_summ.current_page = 1;
			return this.refreshListing();
		},

		async clearFilters(): Promise<SummSaleRefreshOutcome> {
			this.sale_summ.filter.date_range = defaultSummDateRange();
			this.sale_summ.filter.status = undefined;
			this.sale_summ.filter.currency_code = 'MYR';
			this.sale_summ.current_page = 1;
			return this.refreshListing();
		},

		async updateSaleSummPageSize(size: number) {
			await this.setPageSize(size);
		},

		async updateSaleSummPage(page: number) {
			await this.setPage(page);
		},

		async getSaleSummary(): Promise<SummSaleRefreshOutcome> {
			return this.refreshListing();
		},

		async refreshListing(): Promise<SummSaleRefreshOutcome> {
			const generation = ++this.listingGeneration;
			this.sale_summ.loading = true;
			this.listFailure = undefined;
			const { $api } = useNuxtApp();
			try {
				const { data, '@odata.count': total } = await $api.summSales.getSummSales({
					$filter: buildSummSaleBillFilter(this.sale_summ.filter),
					$orderby: 'biz_date desc,status asc',
					$top: this.sale_summ.page_size,
					$skip: (this.sale_summ.current_page - 1) * this.sale_summ.page_size,
				});
				if (generation !== this.listingGeneration) return { status: 'stale' };
				if (data) {
					this.sale_summ.data = data;
					this.sale_summ.total_data = total ?? 0;
				}
				return { status: 'completed' };
			} catch (err: unknown | ErrorResponse) {
				if (generation !== this.listingGeneration) return { status: 'stale' };
				const failure = { kind: 'request_failed' as const, message: (err as ErrorResponse).message ?? 'Failed to load sales summary' };
				this.listFailure = failure;
				return { status: 'failed', failure };
			} finally {
				if (generation === this.listingGeneration) this.sale_summ.loading = false;
			}
		},

		async exportSalesSummary(): Promise<SummSaleExportOutcome> {
			return this.exportSummary();
		},

		async exportSummary(): Promise<SummSaleExportOutcome> {
			this.sale_summ.exporting = true;
			const { $api } = useNuxtApp();
			let objectUrl: string | undefined;
			try {
				const blob = await $api.summSales.exportSalesSummary({
					$filter: buildSummSaleBillFilter(this.sale_summ.filter),
					$orderby: 'biz_date desc,status asc',
					$top: this.sale_summ.page_size,
					$skip: (this.sale_summ.current_page - 1) * this.sale_summ.page_size,
				});
				if (!blob) return { status: 'failed', failure: { kind: 'export_empty' } };
				objectUrl = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = objectUrl;
				link.download = `sales_summary_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				return { status: 'completed' };
			} catch (err: unknown | ErrorResponse) {
				return { status: 'failed', failure: { kind: 'request_failed', message: (err as ErrorResponse).message ?? 'Failed to load sales summary' } };
			} finally {
				if (objectUrl) URL.revokeObjectURL(objectUrl);
				this.sale_summ.exporting = false;
			}
		},

		async updateSaleItemSummPageSize(size: number) {
			this.sale_summ_items.page_size = size;
			this.getSaleItemSummary();

			if (this.sale_summ_items.page_size > this.sale_summ_items.total_data) {
				this.sale_summ_items.current_page = 1;
				return;
			}

			this.getSaleItemSummary();
		},

		async updateSaleItemSummPage(page: number) {
			this.sale_summ_items.current_page = page;

			if (this.sale_summ_items.current_page < 0 || this.sale_summ_items.total_data === this.sale_summ_items.data.length) {
				return;
			}

			this.getSaleItemSummary();
		},

		async getSaleItemSummary() {
			this.sale_summ_items.loading = true;
			const { $api } = useNuxtApp();
			try {
				let filter = '';

				if (this.sale_summ_items.filter.item_status) {
					filter = `item_status eq '${this.sale_summ_items.filter.item_status}'`;
				}

				if (this.sale_summ_items.filter.currency_code) {
					const currencyFilter = `currency_code eq '${this.sale_summ_items.filter.currency_code}'`;
					filter = filter ? `${filter} and ${currencyFilter}` : currencyFilter;
				}

				if (this.sale_summ_items.filter.date_range.end) {
					const dateFilter = `(biz_date between '${getFormattedDate(this.sale_summ_items.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_items.filter.date_range.end ? getFormattedDate(this.sale_summ_items.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				} else {
					const dateFilter = `biz_date le '${getFormattedDate(this.sale_summ_items.filter.date_range.start!, 'yyyy-MM-dd')}'`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				}

				const { data, '@odata.count': total } = await $api.summSales.getSummSalesItems({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_items.page_size,
					$skip: (this.sale_summ_items.current_page - 1) * this.sale_summ_items.page_size,
				});
				if (data) {
					this.sale_summ_items.data = data;
					this.sale_summ_items.total_data = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_items.loading = false;
			}
		},

		async exportSaleItemSummary() {
			this.sale_summ_items.exporting = true;
			const { $api } = useNuxtApp();
			try {
				let filter = '';

				if (this.sale_summ_items.filter.item_status) {
					filter = `item_status eq '${this.sale_summ_items.filter.item_status}'`;
				}

				if (this.sale_summ_items.filter.currency_code) {
					const currencyFilter = `currency_code eq '${this.sale_summ_items.filter.currency_code}'`;
					filter = filter ? `${filter} and ${currencyFilter}` : currencyFilter;
				}

				if (this.sale_summ_items.filter.date_range.end) {
					const dateFilter = `(biz_date between '${getFormattedDate(this.sale_summ_items.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_items.filter.date_range.end ? getFormattedDate(this.sale_summ_items.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				} else {
					const dateFilter = `biz_date le '${getFormattedDate(this.sale_summ_items.filter.date_range.start!, 'yyyy-MM-dd')}'`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				}

				const blob = await $api.summSales.exportSalesItems({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_items.page_size,
					$skip: (this.sale_summ_items.current_page - 1) * this.sale_summ_items.page_size,
				});

				if (blob) {
					const url = window.URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `sales_items_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
					document.body.appendChild(link);
					link.click();

					document.body.removeChild(link);
					window.URL.revokeObjectURL(url);
					successNotification('Sales items exported successfully');
				} else {
					failedNotification('Failed to export sales items');
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_items.exporting = false;
			}
		},

		async updateSalePaymentSummPageSize(size: number) {
			this.sale_summ_payments.page_size = size;
			this.getSalePaymentSummary();

			if (this.sale_summ_payments.page_size > this.sale_summ_payments.total_data) {
				this.sale_summ_payments.current_page = 1;
				return;
			}

			this.getSalePaymentSummary();
		},

		async updateSalePaymentSummPage(page: number) {
			this.sale_summ_payments.current_page = page;

			if (this.sale_summ_payments.current_page < 0 || this.sale_summ_payments.total_data === this.sale_summ_payments.data.length) {
				return;
			}

			this.getSalePaymentSummary();
		},

		async getSalePaymentSummary() {
			this.sale_summ_payments.loading = true;
			const { $api } = useNuxtApp();
			try {
				let filter = '';

				if (this.sale_summ_payments.filter.status) {
					filter = `status eq '${this.sale_summ_payments.filter.status}'`;
				}

				if (this.sale_summ_payments.filter.payment_status) {
					const paymentStatusFilter = `payment_status eq '${this.sale_summ_payments.filter.payment_status}'`;
					filter = filter ? `${filter} and ${paymentStatusFilter}` : paymentStatusFilter;
				}

				if (this.sale_summ_payments.filter.currency_code) {
					const currencyFilter = `currency_code eq '${this.sale_summ_payments.filter.currency_code}'`;
					filter = filter ? `${filter} and ${currencyFilter}` : currencyFilter;
				}

				if (this.sale_summ_payments.filter.date_range.end) {
					const dateFilter = `(biz_date between '${getFormattedDate(this.sale_summ_payments.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_payments.filter.date_range.end ? getFormattedDate(this.sale_summ_payments.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				} else {
					const dateFilter = `biz_date le '${getFormattedDate(this.sale_summ_payments.filter.date_range.start!, 'yyyy-MM-dd')}'`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				}

				const { data, '@odata.count': total } = await $api.summSales.getSummSalesPayments({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_payments.page_size,
					$skip: (this.sale_summ_payments.current_page - 1) * this.sale_summ_payments.page_size,
				});

				if (data) {
					this.sale_summ_payments.data = data;
					this.sale_summ_payments.total_data = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_payments.loading = false;
			}
		},

		async exportSalePaymentSummary() {
			this.sale_summ_payments.exporting = true;
			const { $api } = useNuxtApp();
			try {
				let filter = '';

				if (this.sale_summ_payments.filter.status) {
					filter = `status eq '${this.sale_summ_payments.filter.status}'`;
				}

				if (this.sale_summ_payments.filter.payment_status) {
					const paymentStatusFilter = `payment_status eq '${this.sale_summ_payments.filter.payment_status}'`;
					filter = filter ? `${filter} and ${paymentStatusFilter}` : paymentStatusFilter;
				}

				if (this.sale_summ_payments.filter.currency_code) {
					const currencyFilter = `currency_code eq '${this.sale_summ_payments.filter.currency_code}'`;
					filter = filter ? `${filter} and ${currencyFilter}` : currencyFilter;
				}

				if (this.sale_summ_payments.filter.date_range.end) {
					const dateFilter = `(biz_date between '${getFormattedDate(this.sale_summ_payments.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_payments.filter.date_range.end ? getFormattedDate(this.sale_summ_payments.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				} else {
					const dateFilter = `biz_date le '${getFormattedDate(this.sale_summ_payments.filter.date_range.start!, 'yyyy-MM-dd')}'`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				}

				const blob = await $api.summSales.exportSalesPayments({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_payments.page_size,
					$skip: (this.sale_summ_payments.current_page - 1) * this.sale_summ_payments.page_size,
				});

				if (blob) {
					const url = window.URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `sales_payments_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
					document.body.appendChild(link);
					link.click();

					document.body.removeChild(link);
					window.URL.revokeObjectURL(url);

					successNotification('Sales payments exported successfully');
				} else {
					failedNotification('Failed to export sales payments');
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_payments.loading = false;
			}
		},

		async getSaleCustomerSummary() {
			this.sale_summ_customer.loading = true;
			const { $api } = useNuxtApp();

			try {
				let filter = '';

				if (this.sale_summ_customer.filter.status) {
					filter = `status eq '${this.sale_summ_customer.filter.status}'`;
				}

				if (this.sale_summ_customer.filter.currency_code) {
					const currencyFilter = `currency_code eq '${this.sale_summ_customer.filter.currency_code}'`;
					filter = filter ? `${filter} and ${currencyFilter}` : currencyFilter;
				}

				if (this.sale_summ_customer.filter.date_range.end) {
					const dateFilter = `(biz_date between '${getFormattedDate(this.sale_summ_customer.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_customer.filter.date_range.end ? getFormattedDate(this.sale_summ_customer.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				} else {
					const dateFilter = `biz_date le '${getFormattedDate(this.sale_summ_customer.filter.date_range.start!, 'yyyy-MM-dd')}'`;
					filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				}

				const { data } = await $api.summSales.getSummSalesCustomers({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_customer.page_size,
					$skip: (this.sale_summ_customer.current_page - 1) * this.sale_summ_customer.page_size,
				});

				if (data) {
					this.sale_summ_customer.data = data;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_customer.loading = false;
			}
		},

		async exportSaleCustomerSummary() {
			this.sale_summ_customer.exporting = true;
			const { $api } = useNuxtApp();

			try {
				let filter = `status eq '${this.sale_summ_customer.filter.status}'`;

				if (this.sale_summ_customer.filter.currency_code) {
					filter += ` and currency_code eq '${this.sale_summ_customer.filter.currency_code}'`;
				}

				if (this.sale_summ_customer.filter.date_range.end) {
					filter += ` and (biz_date between '${getFormattedDate(this.sale_summ_customer.filter.date_range.start!, 'yyyy-MM-dd')}' and '${
						this.sale_summ_customer.filter.date_range.end ? getFormattedDate(this.sale_summ_customer.filter.date_range.end!, 'yyyy-MM-dd') : undefined
					}')`;
				} else {
					filter += ` and biz_date le '${getFormattedDate(this.sale_summ_customer.filter.date_range.start!, 'yyyy-MM-dd')}'`;
				}

				const blob = await $api.summSales.exportSalesCustomers({
					$filter: filter,
					$orderby: 'biz_date desc',
					$count: true,
					$top: this.sale_summ_customer.page_size,
					$skip: (this.sale_summ_customer.current_page - 1) * this.sale_summ_customer.page_size,
				});

				if (blob) {
					const url = window.URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `sales_customers_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
					document.body.appendChild(link);
					link.click();

					document.body.removeChild(link);
					window.URL.revokeObjectURL(url);

					successNotification('Sales customers exported successfully');
				} else {
					failedNotification('Failed to export sales customers');
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load sales summary';
				failedNotification(message);
			} finally {
				this.sale_summ_customer.exporting = false;
			}
		},
	},
});
