import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { KEY } from 'yeppi-common';
import { useShippingMethodStore } from '../ShippingMethod/ShippingMethod';
import type { Range } from '~/utils/interface/range';
import type { ShippingMethodOption } from '~/utils/types/order-fulfillment-shipping';
import type {
	ShipmentArrangementApplyResponse,
	ShipmentArrangementApplyRow,
	ShipmentArrangementListRow,
	ShipmentArrangementPreviewResponse,
	ShipmentArrangementPreviewRow,
	ShipmentArrangementQuery,
} from '~/utils/types/shipment-arrangement';

export const SHIPMENT_ARRANGEMENT_FILTER_DEBOUNCE_MS = 300;

export type ShipmentArrangementFailure =
	| { kind: 'unsupported_workbook' }
	| { kind: 'missing_preview' }
	| { kind: 'no_eligible_rows' }
	| { kind: 'request_failed'; message: string };

export type ShipmentArrangementFilters = {
	search: string;
	shippingMethodId: number | undefined;
	dateRange: Range;
};

type RequestFailure = Extract<ShipmentArrangementFailure, { kind: 'request_failed' }>;
type ApplyRejection = Extract<ShipmentArrangementFailure, { kind: 'missing_preview' | 'no_eligible_rows' }>;

export type ShipmentArrangementRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: RequestFailure };

export type ShipmentArrangementPreviewOutcome =
	| { status: 'completed'; preview: ShipmentArrangementPreviewResponse }
	| { status: 'rejected'; failure: { kind: 'unsupported_workbook' } }
	| { status: 'failed'; failure: RequestFailure };

export type ShipmentArrangementApplyOutcome =
	| { status: 'completed'; result: ShipmentArrangementApplyResponse }
	| { status: 'rejected'; failure: ApplyRejection }
	| { status: 'failed'; failure: RequestFailure };

export type ShipmentArrangementExportOutcome =
	| { status: 'completed' }
	| { status: 'failed'; failure: RequestFailure };

export const useShipmentArrangementStore = defineStore('shipment-arrangement', () => {
	const searchState = ref('');
	const shippingMethodIdState = ref<number>();
	const dateRangeState = ref<Range>({ start: undefined, end: undefined });
	const pageState = ref(1);
	const pageSizeState = ref(15);
	const rowsState = ref<ShipmentArrangementListRow[]>([]);
	const totalState = ref(0);
	const loadingState = ref(false);
	const activeShippingMethodsState = ref<ShippingMethodOption[]>([]);
	const optionsLoadingState = ref(false);
	const optionsFailureState = ref<{ kind: 'request_failed'; message: string }>();
	const listFailureState = ref<{ kind: 'request_failed'; message: string }>();
	const exportingState = ref(false);
	const exportFailureState = ref<RequestFailure>();
	let listGeneration = 0;
	let workbookGeneration = 0;
	let filterTimer: ReturnType<typeof setTimeout> | null = null;

	const filters = computed<ShipmentArrangementFilters>(() => ({
		search: searchState.value,
		shippingMethodId: shippingMethodIdState.value,
		dateRange: { ...dateRangeState.value },
	}));
	const firstVisibleRow = computed(() => (totalState.value === 0 ? 0 : (pageState.value - 1) * pageSizeState.value + 1));
	const lastVisibleRow = computed(() => Math.min(pageState.value * pageSizeState.value, totalState.value));
	const previewState = ref<ShipmentArrangementPreviewResponse>();
	const eligibleCount = computed(() => (previewState.value?.valid ?? 0) + (previewState.value?.warnings ?? 0));
	const applyResultState = ref<ShipmentArrangementApplyResponse>();
	const importingState = ref(false);
	const importFailureState = ref<{ kind: 'unsupported_workbook' } | RequestFailure>();
	const applyingState = ref(false);
	const applyFailureState = ref<RequestFailure | ApplyRejection>();

	const toQuery = (paginate: boolean): ShipmentArrangementQuery => ({
		...(paginate ? { $top: pageSizeState.value, $skip: (pageState.value - 1) * pageSizeState.value } : {}),
		...(searchState.value.trim() ? { $search: searchState.value.trim() } : {}),
		...(shippingMethodIdState.value ? { shipping_method_id: shippingMethodIdState.value } : {}),
		...(dateRangeState.value.start ? { start_date: `${dateRangeState.value.start.getFullYear()}-${String(dateRangeState.value.start.getMonth() + 1).padStart(2, '0')}-${String(dateRangeState.value.start.getDate()).padStart(2, '0')}` } : {}),
		...(dateRangeState.value.end ? { end_date: `${dateRangeState.value.end.getFullYear()}-${String(dateRangeState.value.end.getMonth() + 1).padStart(2, '0')}-${String(dateRangeState.value.end.getDate()).padStart(2, '0')}` } : {}),
	});

	const toApplyRow = (row: ShipmentArrangementPreviewRow): ShipmentArrangementApplyRow => ({
		fulfillment_id: row.fulfillment_id,
		source_updated_at: row.source_updated_at,
		order_no: row.order_no,
		batch_no: row.batch_no,
		courier: row.courier,
		tracking_no: row.tracking_no,
	});

	function cancelFilterRefresh(): void {
		if (filterTimer) clearTimeout(filterTimer);
		filterTimer = null;
	}

	async function requestPending(
		listRequestGeneration: number,
		workbookRequestGeneration?: number,
	): Promise<ShipmentArrangementRefreshOutcome> {
		const isCurrent = () => listRequestGeneration === listGeneration
			&& (workbookRequestGeneration === undefined || workbookRequestGeneration === workbookGeneration);
		loadingState.value = true;
		listFailureState.value = undefined;
		try {
			const response = await useNuxtApp().$api.fulfillment.getShipmentArrangement(toQuery(true));
			if (!isCurrent()) return { status: 'stale' };
			rowsState.value = response.data;
			totalState.value = response.total;
			return { status: 'completed' };
		} catch (error) {
			if (!isCurrent()) return { status: 'stale' };
			const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
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
			void requestPending(listRequestGeneration);
		}, SHIPMENT_ARRANGEMENT_FILTER_DEBOUNCE_MS);
	}

	function setSearch(search: string): void {
		searchState.value = search;
		scheduleFilterRefresh();
	}

	function setShippingMethod(shippingMethodId: number | undefined): void {
		shippingMethodIdState.value = shippingMethodId;
		scheduleFilterRefresh();
	}

	function setDateRange(dateRange: Range): void {
		dateRangeState.value = dateRange;
		scheduleFilterRefresh();
	}

	async function refreshPending(): Promise<ShipmentArrangementRefreshOutcome> {
		cancelFilterRefresh();
		return requestPending(++listGeneration);
	}

	async function refreshPendingForWorkbook(workbookSessionGeneration: number): Promise<ShipmentArrangementRefreshOutcome> {
		cancelFilterRefresh();
		return requestPending(++listGeneration, workbookSessionGeneration);
	}

	async function loadActiveShippingMethods(): Promise<void> {
		optionsLoadingState.value = true;
		optionsFailureState.value = undefined;
		try {
			activeShippingMethodsState.value = await useShippingMethodStore().fetchActiveShippingMethodOptions({ notifyOnError: false });
		} catch (error) {
			optionsFailureState.value = { kind: 'request_failed', message: error instanceof Error ? error.message : String(error) };
		} finally {
			optionsLoadingState.value = false;
		}
	}

	async function initialize(): Promise<void> {
		await Promise.all([refreshPending(), loadActiveShippingMethods()]);
	}

	async function setPage(page: number): Promise<void> {
		pageState.value = page;
		await refreshPending();
	}

	async function setPageSize(pageSize: number): Promise<void> {
		pageSizeState.value = pageSize;
		pageState.value = 1;
		await refreshPending();
	}

	async function clearFilters(): Promise<void> {
		searchState.value = '';
		shippingMethodIdState.value = undefined;
		dateRangeState.value = { start: undefined, end: undefined };
		pageState.value = 1;
		await refreshPending();
	}

	function dispose(): void {
		cancelFilterRefresh();
		listGeneration++;
		loadingState.value = false;
	}

	function $reset(): void {
		dispose();
		workbookGeneration++;
		searchState.value = '';
		shippingMethodIdState.value = undefined;
		dateRangeState.value = { start: undefined, end: undefined };
		pageState.value = 1;
		pageSizeState.value = 15;
		rowsState.value = [];
		totalState.value = 0;
		activeShippingMethodsState.value = [];
		optionsLoadingState.value = false;
		optionsFailureState.value = undefined;
		exportingState.value = false;
		exportFailureState.value = undefined;
		previewState.value = undefined;
		applyResultState.value = undefined;
		importingState.value = false;
		importFailureState.value = undefined;
		applyingState.value = false;
		applyFailureState.value = undefined;
		listFailureState.value = undefined;
	}

	async function exportPending(): Promise<ShipmentArrangementExportOutcome> {
		exportingState.value = true;
		exportFailureState.value = undefined;
		let objectUrl: string | undefined;
		try {
			const blob = await useNuxtApp().$api.fulfillment.downloadShipmentArrangement(toQuery(false));
			objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = objectUrl;
			anchor.download = `shipment-arrangement-${new Date().toISOString().slice(0, 10)}.xlsx`;
			anchor.click();
			return { status: 'completed' };
		} catch (error) {
			const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
			exportFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
			exportingState.value = false;
		}
	}

	async function previewWorkbook(file: File): Promise<ShipmentArrangementPreviewOutcome> {
		dismissImport();
		const workbookSessionGeneration = workbookGeneration;
		if (!/\.(xlsx|numbers)$/i.test(file.name)) {
			const failure = { kind: 'unsupported_workbook' as const };
			importFailureState.value = failure;
			return { status: 'rejected', failure };
		}
		importingState.value = true;
		try {
			const response = await useNuxtApp().$api.fulfillment.previewShipmentArrangement(file);
			if (workbookSessionGeneration === workbookGeneration) previewState.value = response;
			return { status: 'completed', preview: response };
		} catch (error) {
			const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
			if (workbookSessionGeneration === workbookGeneration) importFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (workbookSessionGeneration === workbookGeneration) importingState.value = false;
		}
	}

	async function applyPreview(): Promise<ShipmentArrangementApplyOutcome> {
		applyFailureState.value = undefined;
		if (!previewState.value) {
			const failure = { kind: 'missing_preview' as const };
			applyFailureState.value = failure;
			return { status: 'rejected', failure };
		}
		const eligible = previewState.value.rows.filter((row) => row.status !== 'error').map(toApplyRow);
		if (eligible.length === 0) {
			const failure = { kind: 'no_eligible_rows' as const };
			applyFailureState.value = failure;
			return { status: 'rejected', failure };
		}
		const workbookSessionGeneration = workbookGeneration;
		const merchantId = useCookie(KEY.X_MERCHANT_ID).value;
		applyingState.value = true;
		try {
			const result = await useNuxtApp().$api.fulfillment.applyShipmentArrangement({
				merchant_id: String(merchantId ?? ''),
				rows: eligible,
			});
			if (workbookSessionGeneration !== workbookGeneration) return { status: 'completed', result };
			applyResultState.value = result;
			const refreshOutcome = await refreshPendingForWorkbook(workbookSessionGeneration);
			if (refreshOutcome.status !== 'completed' || workbookSessionGeneration !== workbookGeneration) {
				return { status: 'completed', result };
			}
			const lastPage = Math.max(1, Math.ceil(totalState.value / pageSizeState.value));
			if (pageState.value > lastPage) {
				pageState.value = lastPage;
				await refreshPendingForWorkbook(workbookSessionGeneration);
			}
			return { status: 'completed', result };
		} catch (error) {
			const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
			if (workbookSessionGeneration === workbookGeneration) applyFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (workbookSessionGeneration === workbookGeneration) applyingState.value = false;
		}
	}

	function dismissImport(): void {
		workbookGeneration++;
		previewState.value = undefined;
		applyResultState.value = undefined;
		importFailureState.value = undefined;
		applyFailureState.value = undefined;
		importingState.value = false;
		applyingState.value = false;
	}

	return {
		filters,
		page: computed(() => pageState.value),
		pageSize: computed(() => pageSizeState.value),
		rows: computed<readonly ShipmentArrangementListRow[]>(() => rowsState.value),
		total: computed(() => totalState.value),
		firstVisibleRow,
		lastVisibleRow,
		activeShippingMethods: computed<readonly ShippingMethodOption[]>(() => activeShippingMethodsState.value),
		preview: computed(() => previewState.value),
		eligibleCount,
		applyResult: computed(() => applyResultState.value),
		loading: computed(() => loadingState.value),
		exporting: computed(() => exportingState.value),
		importing: computed(() => importingState.value),
		applying: computed(() => applyingState.value),
		optionsFailure: computed(() => optionsFailureState.value),
		listFailure: computed(() => listFailureState.value),
		exportFailure: computed(() => exportFailureState.value),
		importFailure: computed(() => importFailureState.value),
		applyFailure: computed(() => applyFailureState.value),
		refreshPending,
		initialize,
		setPage,
		setPageSize,
		setSearch,
		setShippingMethod,
		setDateRange,
		clearFilters,
		dispose,
		$reset,
		exportPending,
		previewWorkbook,
		applyPreview,
		dismissImport,
	};
});
