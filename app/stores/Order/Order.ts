import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
	defaultOrderRelations,
	getFormattedDate,
	removeDuplicateExpands,
	OrderStatus,
	PaymentStatus,
	type OrderResendEmailAction,
	type ErrorResponse,
} from 'yeppi-common';
import { getDefaultOrderStatuses, options_page_size } from '~/utils/options';
import { buildOrderStatusODataFilter } from '~/utils/order-status-filter';
import { buildOrderExportQueryParams, type OrderExportOptions } from '~/utils/order-export';
import { ORDERS_SELECTED_STATUSES_STORAGE_KEY, resolveOrderStatusesFromStorage } from '~/utils/orders-selected-statuses-storage';
import type { CustomerModel } from '~/utils/models/customer.model';
import type { ItemModel } from '~/utils/models/item.model';
import type { PaymentModel } from '~/utils/models/payment.model';
import type { Range } from '~/utils/interface';
import { sub } from 'date-fns';
import type { CustomerRequest, OrderHistory } from '~/utils/types/order-history';

export const ORDER_HISTORY_FILTER_DEBOUNCE_MS = 500;
export const ORDER_HISTORY_REFRESH_COOLDOWN_SECONDS = 5;

export type OrderHistoryOwner = 'order' | 'sale';

export type OrderHistoryFilters = {
	search: string;
	statuses: OrderStatus[];
	paymentStatus: PaymentStatus | undefined;
	paymentMethod: string | undefined;
	dateRange: Range;
	currencyCode: string;
};

export type OrderHistoryFailure =
	| { kind: 'request_failed'; message: string }
	| { kind: 'missing_session' }
	| { kind: 'cooldown' }
	| { kind: 'export_empty' };

type RequestFailure = Extract<OrderHistoryFailure, { kind: 'request_failed' }>;

export type OrderHistoryRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: RequestFailure };

export type OrderHistoryExportOutcome =
	| { status: 'completed' }
	| { status: 'failed'; failure: RequestFailure | { kind: 'export_empty' } };

type OrderHistoryExportFailure = Extract<OrderHistoryExportOutcome, { status: 'failed' }>['failure'];

export type OrderHistorySessionOutcome =
	| { status: 'completed' }
	| { status: 'failed'; failure: RequestFailure }
	| { status: 'rejected'; failure: { kind: 'missing_session' } | { kind: 'cooldown' } };

export type OrderHistoryStatusOutcome =
	| { status: 'completed'; stayOnPage: boolean }
	| { status: 'failed'; failure: RequestFailure }
	| { status: 'rejected'; failure: { kind: 'missing_session' } };

const defaultDateRange = (): Range => ({
	start: sub(new Date(), { days: 14 }),
	end: new Date(),
});

const defaultPageSize = options_page_size[0] as number;

const getPendingCustomerRequest = (order: OrderHistory): CustomerRequest | undefined =>
	order.customer_requests?.find((request) => request.status === 'pending');

const isPendingCustomerRequest = (order: OrderHistory) => getPendingCustomerRequest(order) != null;

const firstString = (value: unknown): string | undefined => {
	const candidate = Array.isArray(value) ? value[0] : value;
	return typeof candidate === 'string' && candidate.length ? candidate : undefined;
};

const parseDate = (value: unknown): Date | undefined => {
	const raw = firstString(value);
	if (!raw) return undefined;
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? undefined : date;
};

const VALID_ORDER_STATUSES = new Set(Object.values(OrderStatus));
const VALID_PAYMENT_STATUSES = new Set(Object.values(PaymentStatus));

const parseStatuses = (value: unknown): OrderStatus[] => {
	const values = Array.isArray(value)
		? value.filter((entry): entry is string => typeof entry === 'string')
		: firstString(value)
			?.split(',')
			.map((part) => part.trim())
			.filter(Boolean) ?? [];
	return values.filter((entry): entry is OrderStatus => VALID_ORDER_STATUSES.has(entry as OrderStatus));
};

const requestFailure = (error: unknown): RequestFailure => {
	const message = (error as ErrorResponse)?.message ?? (error instanceof Error ? error.message : String(error));
	return { kind: 'request_failed', message: message || 'Failed to process order' };
};

const readStoredStatuses = (): OrderStatus[] => {
	try {
		const raw = globalThis.localStorage?.getItem(ORDERS_SELECTED_STATUSES_STORAGE_KEY);
		return resolveOrderStatusesFromStorage(raw ? JSON.parse(raw) : null);
	} catch {
		return getDefaultOrderStatuses();
	}
};

const persistStatuses = (statuses: OrderStatus[]): void => {
	try {
		globalThis.localStorage?.setItem(ORDERS_SELECTED_STATUSES_STORAGE_KEY, JSON.stringify(statuses));
	} catch {
		// Ignore quota / private-mode failures; listing still works in-memory.
	}
};

const buildDateFilter = (range: Range): string => {
	const start = range.start ?? new Date();
	const end = range.end ?? new Date();
	return range.end
		? `(biz_date between '${getFormattedDate(start, 'yyyy-MM-dd')}' and '${getFormattedDate(end, 'yyyy-MM-dd')}')`
		: `biz_date le '${getFormattedDate(start, 'yyyy-MM-dd')}'`;
};

export const useOrderStore = defineStore('orderStore', () => {
	const searchState = ref('');
	const statusesState = ref<OrderStatus[]>(readStoredStatuses());
	const paymentStatusState = ref<PaymentStatus>();
	const paymentMethodState = ref<string>();
	const dateRangeState = ref<Range>(defaultDateRange());
	const currencyCodeState = ref('MYR');
	const pageState = ref(1);
	const pageSizeState = ref(defaultPageSize);
	const ordersState = ref<OrderHistory[]>([]);
	const totalState = ref(0);
	const loadingState = ref(false);
	const listFailureState = ref<RequestFailure>();
	const exportingState = ref(false);
	const exportFailureState = ref<OrderHistoryExportFailure>();

	const dashboardOrdersState = ref<OrderHistory[]>([]);
	const dashboardLoadingState = ref(false);
	const dashboardFailureState = ref<RequestFailure>();

	const urgentCustomerRequestsState = ref<OrderHistory[]>([]);
	const urgentCustomerRequestsLoadingState = ref(false);
	const urgentFailureState = ref<RequestFailure>();

	const currentState = ref<OrderHistory>();
	const notFoundState = ref(false);
	const ownerState = ref<OrderHistoryOwner>('order');
	const sessionLoadingState = ref(false);
	const updatingState = ref(false);
	const resendingEmailState = ref(false);
	const refreshingState = ref(false);
	const refreshCooldownState = ref(0);
	const sessionFailureState = ref<RequestFailure>();

	let listGeneration = 0;
	let filterTimer: ReturnType<typeof setTimeout> | null = null;
	let cooldownTimer: ReturnType<typeof setInterval> | null = null;

	const filters = computed<OrderHistoryFilters>(() => ({
		search: searchState.value,
		statuses: [...statusesState.value],
		paymentStatus: paymentStatusState.value,
		paymentMethod: paymentMethodState.value,
		dateRange: { ...dateRangeState.value },
		currencyCode: currencyCodeState.value,
	}));

	const toListQuery = (range: Range, statuses: OrderStatus[], extras?: { excludeCompleted?: boolean; paymentMethod?: string; paymentStatus?: PaymentStatus; search?: string; top?: number; skip?: number }) => {
		let filter = buildOrderStatusODataFilter(statuses, {
			payment_method: extras?.paymentMethod,
			excludeCompleted: extras?.excludeCompleted,
		});
		if (extras?.paymentStatus) {
			const paymentFilter = `payment_status eq '${extras.paymentStatus}'`;
			filter = filter ? `${filter} and ${paymentFilter}` : paymentFilter;
		}
		const dateFilter = buildDateFilter(range);
		filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
		const queryParams: Record<string, unknown> = {
			$top: extras?.top ?? pageSizeState.value,
			$skip: extras?.skip ?? (pageState.value - 1) * pageSizeState.value,
			$count: true,
			$filter: filter,
			$expand: removeDuplicateExpands(defaultOrderRelations).join(','),
			$orderby: 'biz_date desc, created_at desc',
		};
		if (extras?.search?.trim()) queryParams.$search = extras.search.trim();
		return queryParams;
	};

	function cancelFilterRefresh(): void {
		if (filterTimer) clearTimeout(filterTimer);
		filterTimer = null;
	}

	function clearCooldown(): void {
		if (cooldownTimer) clearInterval(cooldownTimer);
		cooldownTimer = null;
		refreshCooldownState.value = 0;
	}

	function startCooldown(): void {
		clearCooldown();
		refreshCooldownState.value = ORDER_HISTORY_REFRESH_COOLDOWN_SECONDS;
		cooldownTimer = setInterval(() => {
			refreshCooldownState.value -= 1;
			if (refreshCooldownState.value <= 0) clearCooldown();
		}, 1000);
	}

	async function requestListing(listRequestGeneration: number): Promise<OrderHistoryRefreshOutcome> {
		loadingState.value = true;
		listFailureState.value = undefined;
		try {
			const { data, '@odata.count': total } = await useNuxtApp().$api.order.getOrders(
				toListQuery(dateRangeState.value, statusesState.value, {
					paymentMethod: paymentMethodState.value,
					paymentStatus: paymentStatusState.value,
					search: searchState.value,
				}),
			);
			if (listRequestGeneration !== listGeneration) return { status: 'stale' };
			ordersState.value = data ?? [];
			totalState.value = total ?? 0;
			return { status: 'completed' };
		} catch (error) {
			if (listRequestGeneration !== listGeneration) return { status: 'stale' };
			const failure = requestFailure(error);
			listFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (listRequestGeneration === listGeneration) loadingState.value = false;
		}
	}

	function scheduleFilterRefresh(): void {
		cancelFilterRefresh();
		pageState.value = 1;
		const listRequestGeneration = ++listGeneration;
		filterTimer = setTimeout(() => {
			filterTimer = null;
			void requestListing(listRequestGeneration);
		}, ORDER_HISTORY_FILTER_DEBOUNCE_MS);
	}

	async function refreshListing(): Promise<OrderHistoryRefreshOutcome> {
		cancelFilterRefresh();
		return requestListing(++listGeneration);
	}

	function setSearch(search: string): void {
		searchState.value = search;
		scheduleFilterRefresh();
	}

	function setStatuses(statuses: OrderStatus[]): void {
		statusesState.value = statuses;
		paymentStatusState.value = undefined;
		paymentMethodState.value = undefined;
		persistStatuses(statuses);
		pageState.value = 1;
		void refreshListing();
	}

	function setDateRange(dateRange: Range): void {
		dateRangeState.value = dateRange;
		pageState.value = 1;
		void refreshListing();
	}

	function hydrateFromQuery(query: Record<string, unknown>): void {
		paymentStatusState.value = undefined;
		paymentMethodState.value = undefined;
		statusesState.value = readStoredStatuses();
		const start = parseDate(query.start_date);
		const end = parseDate(query.end_date);
		if (start) dateRangeState.value = { ...dateRangeState.value, start };
		if (end) dateRangeState.value = { ...dateRangeState.value, end };
		const parsedStatuses = parseStatuses(query.status);
		if (parsedStatuses.length) statusesState.value = parsedStatuses;
		const paymentStatus = firstString(query.payment_status);
		if (paymentStatus && VALID_PAYMENT_STATUSES.has(paymentStatus as PaymentStatus)) {
			paymentStatusState.value = paymentStatus as PaymentStatus;
		}
		const paymentMethod = firstString(query.payment_method);
		if (paymentMethod) paymentMethodState.value = paymentMethod;
		persistStatuses(statusesState.value);
	}

	async function setPage(page: number): Promise<OrderHistoryRefreshOutcome> {
		pageState.value = page;
		return refreshListing();
	}

	async function setPageSize(pageSize: number): Promise<OrderHistoryRefreshOutcome> {
		pageSizeState.value = pageSize;
		pageState.value = 1;
		return refreshListing();
	}

	async function clearFilters(): Promise<OrderHistoryRefreshOutcome> {
		searchState.value = '';
		statusesState.value = getDefaultOrderStatuses();
		paymentStatusState.value = undefined;
		paymentMethodState.value = undefined;
		currencyCodeState.value = 'MYR';
		dateRangeState.value = defaultDateRange();
		pageState.value = 1;
		persistStatuses(statusesState.value);
		return refreshListing();
	}

	async function loadDashboard(input: { range: Range; hideCompleted: boolean }): Promise<OrderHistoryRefreshOutcome> {
		dashboardLoadingState.value = true;
		dashboardFailureState.value = undefined;
		try {
			const { data } = await useNuxtApp().$api.order.getOrders(
				toListQuery(input.range, getDefaultOrderStatuses(), {
					excludeCompleted: input.hideCompleted,
					top: defaultPageSize,
					skip: 0,
				}),
			);
			dashboardOrdersState.value = data ?? [];
			return { status: 'completed' };
		} catch (error) {
			const failure = requestFailure(error);
			dashboardFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			dashboardLoadingState.value = false;
		}
	}

	async function loadUrgentCustomerRequests(range: Range): Promise<OrderHistoryRefreshOutcome> {
		urgentCustomerRequestsLoadingState.value = true;
		urgentFailureState.value = undefined;
		try {
			const dateFilter = buildDateFilter(range);
			const { data } = await useNuxtApp().$api.order.getOrders({
				$top: 10,
				$skip: 0,
				$count: false,
				$filter: `status eq '${OrderStatus.REQUIRES_ACTION}' and ${dateFilter}`,
				$expand: removeDuplicateExpands(defaultOrderRelations).join(','),
				$orderby: 'updated_at desc, biz_date desc, created_at desc',
			});
			urgentCustomerRequestsState.value = (data ?? []).filter(isPendingCustomerRequest);
			return { status: 'completed' };
		} catch (error) {
			const failure = requestFailure(error);
			urgentFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			urgentCustomerRequestsLoadingState.value = false;
		}
	}

	async function exportOrders(options: OrderExportOptions): Promise<OrderHistoryExportOutcome> {
		exportingState.value = true;
		exportFailureState.value = undefined;
		let objectUrl: string | undefined;
		try {
			const queryParams = buildOrderExportQueryParams(options);
			const blob = await useNuxtApp().$api.order.exportOrders(queryParams);
			if (!blob) {
				const failure = { kind: 'export_empty' as const };
				exportFailureState.value = failure;
				return { status: 'failed', failure };
			}
			objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			const suffix = options.include_item_details ? '_detail' : '';
			anchor.download = `orders${suffix}_${getFormattedDate(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
			anchor.click();
			return { status: 'completed' };
		} catch (error) {
			const failure = requestFailure(error);
			exportFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
			exportingState.value = false;
		}
	}

	async function fetchCurrent(orderNo: string, owner: OrderHistoryOwner): Promise<OrderHistory | undefined> {
		if (owner === 'sale') {
			const data = await useNuxtApp().$api.sale.getBillDetailsByOrderNo(orderNo);
			return data.bill;
		}
		const data = await useNuxtApp().$api.order.getOrderByOrderNo(orderNo);
		return data.order;
	}

	async function open(orderNo: string, owner: OrderHistoryOwner, options: { silent?: boolean } = {}): Promise<OrderHistorySessionOutcome> {
		const silent = options.silent === true;
		ownerState.value = owner;
		sessionFailureState.value = undefined;
		if (!silent) {
			notFoundState.value = false;
			sessionLoadingState.value = true;
		}
		try {
			const record = await fetchCurrent(orderNo, owner);
			if (!record) {
				if (!silent || !currentState.value) {
					currentState.value = undefined;
					notFoundState.value = true;
				}
				return { status: 'completed' };
			}
			currentState.value = record;
			return { status: 'completed' };
		} catch (error) {
			if (!silent) {
				currentState.value = undefined;
				notFoundState.value = true;
			}
			const failure = requestFailure(error);
			sessionFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (!silent) sessionLoadingState.value = false;
		}
	}

	async function reloadCurrent(): Promise<OrderHistorySessionOutcome> {
		if (!currentState.value?.order_no) {
			return { status: 'rejected', failure: { kind: 'missing_session' } };
		}
		return open(currentState.value.order_no, ownerState.value, { silent: true });
	}

	function applyLocalStatus(status: OrderStatus): void {
		if (!currentState.value) return;
		currentState.value = { ...currentState.value, status };
	}

	async function refreshCurrent(): Promise<OrderHistorySessionOutcome> {
		if (refreshCooldownState.value > 0 || refreshingState.value) {
			return { status: 'rejected', failure: { kind: 'cooldown' } };
		}
		if (!currentState.value?.order_no) {
			return { status: 'rejected', failure: { kind: 'missing_session' } };
		}
		refreshingState.value = true;
		try {
			const outcome = await reloadCurrent();
			if (outcome.status === 'completed' && currentState.value) startCooldown();
			return outcome;
		} finally {
			refreshingState.value = false;
		}
	}

	async function updateStatus(status: OrderStatus): Promise<OrderHistoryStatusOutcome> {
		if (!currentState.value) return { status: 'rejected', failure: { kind: 'missing_session' } };
		updatingState.value = true;
		try {
			const { order_no, customer } = currentState.value;
			if (ownerState.value === 'order') {
				const data = await useNuxtApp().$api.order.updateStatus(order_no, customer.customer_no, status);
				const stayOnPage = !!(data?.status && status !== OrderStatus.COMPLETED);
				if (stayOnPage) {
					applyLocalStatus(status);
					await reloadCurrent();
				}
				return { status: 'completed', stayOnPage };
			}
			const data = await useNuxtApp().$api.sale.updateStatus(order_no, customer.customer_no, status);
			if (data?.status) {
				applyLocalStatus(status);
				await reloadCurrent();
			}
			return { status: 'completed', stayOnPage: !!data?.status };
		} catch (error) {
			return { status: 'failed', failure: requestFailure(error) };
		} finally {
			updatingState.value = false;
		}
	}

	async function updatePayments(payment: PaymentModel, existingPayments: PaymentModel[]): Promise<OrderHistorySessionOutcome> {
		if (!currentState.value) return { status: 'rejected', failure: { kind: 'missing_session' } };
		const payments = existingPayments.length === 0 ? [{ ...payment, payment_line: 1 }] : existingPayments;
		try {
			const data = await useNuxtApp().$api.order.updatePayments(currentState.value.order_no, currentState.value.customer.customer_no, payments);
			if (data.status) await reloadCurrent();
			return { status: 'completed' };
		} catch (error) {
			return { status: 'failed', failure: requestFailure(error) };
		}
	}

	async function updateCustomer(customer: CustomerModel): Promise<OrderHistorySessionOutcome> {
		if (!currentState.value) return { status: 'rejected', failure: { kind: 'missing_session' } };
		try {
			const data = await useNuxtApp().$api.order.updateCustomer(currentState.value.order_no, customer);
			if (data.status) await reloadCurrent();
			return { status: 'completed' };
		} catch (error) {
			return { status: 'failed', failure: requestFailure(error) };
		}
	}

	async function updateItems(item: ItemModel, existingItems: ItemModel[]): Promise<OrderHistorySessionOutcome> {
		if (!currentState.value) return { status: 'rejected', failure: { kind: 'missing_session' } };
		try {
			const items = existingItems.map((orderItem) => (orderItem.item_line === item.item_line ? item : orderItem));
			const data = await useNuxtApp().$api.order.updateItems(currentState.value.order_no, currentState.value.customer.customer_no, items);
			if (data.status) await reloadCurrent();
			return { status: 'completed' };
		} catch (error) {
			return { status: 'failed', failure: requestFailure(error) };
		}
	}

	async function resendCurrentStatusEmail(action: OrderResendEmailAction): Promise<OrderHistorySessionOutcome> {
		if (!currentState.value) return { status: 'rejected', failure: { kind: 'missing_session' } };
		resendingEmailState.value = true;
		try {
			const api = ownerState.value === 'sale' ? useNuxtApp().$api.sale : useNuxtApp().$api.order;
			await api.resendCurrentStatusEmail(currentState.value.order_no, action);
			return { status: 'completed' };
		} catch (error) {
			return { status: 'failed', failure: requestFailure(error) };
		} finally {
			resendingEmailState.value = false;
		}
	}

	function closeSession(): void {
		currentState.value = undefined;
		notFoundState.value = false;
		sessionFailureState.value = undefined;
		clearCooldown();
	}

	function dispose(): void {
		cancelFilterRefresh();
		listGeneration++;
		loadingState.value = false;
		clearCooldown();
	}

	function $reset(): void {
		dispose();
		searchState.value = '';
		statusesState.value = getDefaultOrderStatuses();
		paymentStatusState.value = undefined;
		paymentMethodState.value = undefined;
		dateRangeState.value = defaultDateRange();
		currencyCodeState.value = 'MYR';
		pageState.value = 1;
		pageSizeState.value = defaultPageSize;
		ordersState.value = [];
		totalState.value = 0;
		listFailureState.value = undefined;
		exportingState.value = false;
		exportFailureState.value = undefined;
		dashboardOrdersState.value = [];
		dashboardLoadingState.value = false;
		dashboardFailureState.value = undefined;
		urgentCustomerRequestsState.value = [];
		urgentCustomerRequestsLoadingState.value = false;
		urgentFailureState.value = undefined;
		closeSession();
		updatingState.value = false;
		resendingEmailState.value = false;
		refreshingState.value = false;
		sessionLoadingState.value = false;
		ownerState.value = 'order';
	}

	return {
		filters,
		page: computed(() => pageState.value),
		pageSize: computed(() => pageSizeState.value),
		orders: computed(() => ordersState.value),
		total: computed(() => totalState.value),
		loading: computed(() => loadingState.value),
		listFailure: computed(() => listFailureState.value),
		exporting: computed(() => exportingState.value),
		exportFailure: computed(() => exportFailureState.value),
		dashboardOrders: computed(() => dashboardOrdersState.value),
		dashboardLoading: computed(() => dashboardLoadingState.value),
		dashboardFailure: computed(() => dashboardFailureState.value),
		urgentCustomerRequests: computed(() => urgentCustomerRequestsState.value),
		urgentCustomerRequestsLoading: computed(() => urgentCustomerRequestsLoadingState.value),
		urgentFailure: computed(() => urgentFailureState.value),
		current: computed(() => currentState.value),
		notFound: computed(() => notFoundState.value),
		owner: computed(() => ownerState.value),
		sessionLoading: computed(() => sessionLoadingState.value),
		updating: computed(() => updatingState.value),
		resendingEmail: computed(() => resendingEmailState.value),
		refreshing: computed(() => refreshingState.value),
		refreshCooldown: computed(() => refreshCooldownState.value),
		sessionFailure: computed(() => sessionFailureState.value),
		setSearch,
		setStatuses,
		setDateRange,
		hydrateFromQuery,
		setPage,
		setPageSize,
		clearFilters,
		refreshListing,
		loadDashboard,
		loadUrgentCustomerRequests,
		exportOrders,
		open,
		refreshCurrent,
		updateStatus,
		updatePayments,
		updateCustomer,
		updateItems,
		resendCurrentStatusEmail,
		closeSession,
		dispose,
		$reset,
	};
});
