import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { KEY } from 'yeppi-common';
import type { Range } from '~/utils/interface/range';
import type {
	ShipmentArrangementApplyResponse,
	ShipmentArrangementApplyRow,
	ShipmentArrangementListRow,
	ShipmentArrangementPreviewResponse,
	ShipmentArrangementPreviewRow,
	ShipmentArrangementQuery,
} from '~/utils/types/shipment-arrangement';

export const SHIPMENT_ARRANGEMENT_FILTER_DEBOUNCE_MS = 300;

export type ShipmentArrangementRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: { kind: 'request_failed'; message: string } };

export const useShipmentArrangementStore = defineStore('shipment-arrangement', () => {
	const searchState = ref('');
	const shippingMethodIdState = ref<number>();
	const dateRangeState = ref<Range>({ start: undefined, end: undefined });
	const pageState = ref(1);
	const pageSizeState = ref(15);
	const rowsState = ref<ShipmentArrangementListRow[]>([]);
	const totalState = ref(0);
	const loadingState = ref(false);
	const listFailureState = ref<{ kind: 'request_failed'; message: string }>();
	let listGeneration = 0;
	let filterTimer: ReturnType<typeof setTimeout> | null = null;

	const filters = reactive({
		get search(): string {
			return searchState.value;
		},
		set search(value: string) {
			searchState.value = value;
		},
		get shippingMethodId(): number | undefined {
			return shippingMethodIdState.value;
		},
		set shippingMethodId(value: number | undefined) {
			shippingMethodIdState.value = value;
		},
		get dateRange(): Range {
			return dateRangeState.value;
		},
		set dateRange(value: Range) {
			dateRangeState.value = value;
		},
	});
	const preview = ref<ShipmentArrangementPreviewResponse>();
	const applyResult = ref<ShipmentArrangementApplyResponse>();

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

	async function requestPending(generation: number): Promise<ShipmentArrangementRefreshOutcome> {
		loadingState.value = true;
		listFailureState.value = undefined;
		try {
			const response = await useNuxtApp().$api.fulfillment.getShipmentArrangement(toQuery(true));
			if (generation !== listGeneration) return { status: 'stale' };
			rowsState.value = response.data;
			totalState.value = response.total;
			return { status: 'completed' };
		} catch (error) {
			if (generation !== listGeneration) return { status: 'stale' };
			const failure = { kind: 'request_failed' as const, message: error instanceof Error ? error.message : String(error) };
			listFailureState.value = failure;
			return { status: 'failed', failure };
		} finally {
			if (generation === listGeneration) loadingState.value = false;
		}
	}

	function scheduleFilterRefresh(): void {
		cancelFilterRefresh();
		pageState.value = 1;
		const generation = ++listGeneration;
		filterTimer = setTimeout(() => {
			filterTimer = null;
			void requestPending(generation);
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

	async function setPage(page: number): Promise<ShipmentArrangementRefreshOutcome> {
		pageState.value = page;
		return refreshPending();
	}

	async function setPageSize(pageSize: number): Promise<ShipmentArrangementRefreshOutcome> {
		pageSizeState.value = pageSize;
		pageState.value = 1;
		return refreshPending();
	}

	async function clearFilters(): Promise<ShipmentArrangementRefreshOutcome> {
		searchState.value = '';
		shippingMethodIdState.value = undefined;
		dateRangeState.value = { start: undefined, end: undefined };
		pageState.value = 1;
		return refreshPending();
	}

	function dispose(): void {
		cancelFilterRefresh();
		listGeneration++;
		loadingState.value = false;
	}

	function $reset(): void {
		dispose();
		searchState.value = '';
		shippingMethodIdState.value = undefined;
		dateRangeState.value = { start: undefined, end: undefined };
		pageState.value = 1;
		pageSizeState.value = 15;
		rowsState.value = [];
		totalState.value = 0;
		preview.value = undefined;
		applyResult.value = undefined;
		listFailureState.value = undefined;
	}

	async function fetchPending(): Promise<void> {
		await refreshPending();
	}

	async function exportPending(): Promise<void> {
		const blob = await useNuxtApp().$api.fulfillment.downloadShipmentArrangement(toQuery(false));
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `shipment-arrangement-${new Date().toISOString().slice(0, 10)}.xlsx`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function previewFile(file: File): Promise<void> {
		preview.value = await useNuxtApp().$api.fulfillment.previewShipmentArrangement(file);
		applyResult.value = undefined;
	}

	async function applyPreview(): Promise<void> {
		if (!preview.value) return;
		const eligible = preview.value.rows.filter((row) => row.status !== 'error').map(toApplyRow);
		const merchantId = useCookie(KEY.X_MERCHANT_ID).value;
		applyResult.value = await useNuxtApp().$api.fulfillment.applyShipmentArrangement({
			merchant_id: String(merchantId ?? ''),
			rows: eligible,
		});
		await fetchPending();
		const lastPage = Math.max(1, Math.ceil(totalState.value / pageSizeState.value));
		if (pageState.value > lastPage) {
			pageState.value = lastPage;
			await fetchPending();
		}
	}

	function resetPreview(): void {
		preview.value = undefined;
		applyResult.value = undefined;
	}

	return {
		filters,
		page: pageState,
		pageSize: pageSizeState,
		rows: rowsState,
		total: totalState,
		preview,
		applyResult,
		loading: loadingState,
		fetchPending,
		refreshPending,
		setPage,
		setPageSize,
		setSearch,
		setShippingMethod,
		setDateRange,
		clearFilters,
		dispose,
		$reset,
		exportPending,
		previewFile,
		applyPreview,
		resetPreview,
	};
});
