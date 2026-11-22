import type { Ref } from 'vue';
import type { OrderItemStatus, OrderStatus, PaymentStatus } from 'yeppi-common';
import type { Range } from '~/utils/interface';

export type AnalyticsReportFilters = {
	date_range: Range;
	status?: OrderStatus;
	item_status?: OrderItemStatus;
	payment_status?: PaymentStatus;
	currency_code?: string;
};

export function useAnalyticsReportControls(
	report: Readonly<Ref<{ filter: AnalyticsReportFilters; current_page: number; page_size: number }>>,
	refresh: () => Promise<unknown>,
) {
	const filtersOpen = ref(false);

	async function applyMobileFilters(filters: AnalyticsReportFilters) {
		Object.assign(report.value.filter, filters);
		report.value.current_page = 1;
		filtersOpen.value = false;
		await refresh();
	}

	async function setMobilePageSize(size: number) {
		report.value.page_size = size;
		report.value.current_page = 1;
		await refresh();
	}

	return { filtersOpen, applyMobileFilters, setMobilePageSize };
}
