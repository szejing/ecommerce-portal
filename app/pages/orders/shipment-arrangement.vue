<template>
	<ZPagePanel id="shipment-arrangement" :title="t('shipmentArrangement.title')" back-to="/orders">
		<div class="min-w-0 space-y-3 lg:space-y-5">
			<p class="hidden max-w-3xl text-sm leading-5 text-muted lg:block">{{ t('shipmentArrangement.subtitle') }}</p>

			<ShipmentArrangementWorkflowGuide
				:pending-count="store.total"
				:exporting="store.exporting"
				:importing="store.importing"
				@export="exportPending"
				@import="openFilePicker"
			/>

			<UAlert
				v-if="store.listFailure"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				:title="t('shipmentArrangement.states.loadErrorTitle')"
				:description="store.listFailure.message"
			>
				<template #actions>
					<UButton data-testid="refresh-pending" color="error" variant="outline" size="sm" class="max-lg:min-h-11" :label="t('common.refresh')" @click="store.refreshPending" />
				</template>
			</UAlert>
			<UAlert
				v-if="store.importFailure"
				color="error"
				variant="soft"
				icon="i-lucide-file-warning"
				:title="t('shipmentArrangement.states.uploadErrorTitle')"
				:description="importFailureDescription"
			/>

			<section class="rounded-lg border border-default bg-default p-3 lg:p-4" :aria-label="t('shipmentArrangement.filters.title')">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_minmax(12rem,0.8fr)_auto_auto] xl:items-end">
					<label class="min-w-0 space-y-1.5 text-sm font-medium text-default">
						<span class="max-lg:sr-only">{{ t('shipmentArrangement.filters.searchLabel') }}</span>
						<UInput :model-value="store.filters.search" inputmode="search" :aria-label="t('shipmentArrangement.filters.searchLabel')" :ui="{ base: 'max-lg:min-h-11 max-lg:text-base' }" icon="i-lucide-search" :placeholder="t('shipmentArrangement.filters.search')" @update:model-value="store.setSearch" />
					</label>
					<details :open="desktop" class="max-lg:space-y-2 lg:contents">
						<summary class="min-h-11 cursor-pointer py-3 text-sm font-medium text-primary lg:hidden">
							{{ t('shipmentArrangement.filters.title') }}
						</summary>
						<label class="min-w-0 space-y-1.5 text-sm font-medium text-default">
							<span>{{ t('shipmentArrangement.filters.shippingMethodLabel') }}</span>
							<USelectMenu
								:model-value="store.filters.shippingMethodId"
								:aria-label="t('shipmentArrangement.filters.shippingMethodLabel')"
								data-testid="shipping-method-filter"
								class="w-full max-lg:min-h-11"
								:items="shippingMethodOptions"
								value-key="value"
								:placeholder="t('shipmentArrangement.filters.shippingMethod')"
								@update:model-value="store.setShippingMethod"
							/>
						</label>
						<div class="min-w-0 space-y-1.5 text-sm font-medium text-default">
							<span>{{ t('shipmentArrangement.filters.orderDate') }}</span>
							<ZDateRange :model-value="store.filters.dateRange" hide-presets @update:model-value="store.setDateRange" />
						</div>
						<div class="flex flex-col gap-2 sm:flex-row xl:justify-end">
							<UButton
								data-testid="clear-filters"
								class="min-h-11 justify-center"
								color="neutral"
								variant="ghost"
								icon="i-lucide-eraser"
								:label="t('shipmentArrangement.actions.clearFilters')"
								:aria-label="t('shipmentArrangement.actions.clearFilters')"
								@click="store.clearFilters"
							/>
						</div>
					</details>
				</div>
				<input ref="fileInput" class="hidden" type="file" accept=".xlsx,.numbers" @change="onFileSelected" />
			</section>

			<section class="min-w-0 rounded-lg border border-default bg-default" :aria-label="t('shipmentArrangement.table.title')">
				<div class="flex flex-col gap-3 border-b border-default p-3 sm:flex-row lg:p-4 sm:items-center sm:justify-between">
					<div>
						<h2 class="text-base font-semibold text-default">{{ t('shipmentArrangement.table.pendingTitle') }}</h2>
						<p class="text-sm text-muted">{{ t('shipmentArrangement.table.pendingCount', { count: store.total }) }}</p>
					</div>
					<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
						<div v-if="isEasyParcelConnected" class="grid gap-2 sm:flex sm:flex-wrap">
							<UButton
								v-if="desktop"
								data-testid="push-selected-easyparcel"
								color="primary"
								variant="soft"
								icon="i-lucide-truck"
								class="min-h-11 min-w-0 justify-center whitespace-normal"
								:disabled="store.loading || selectedCount === 0"
								@click="openSelectedBooking"
							>
								{{ t('shipmentArrangement.actions.pushSelected', { count: selectedCount }) }}
							</UButton>
							<UButton
								data-testid="push-all-easyparcel"
								color="primary"
								variant="outline"
								icon="i-lucide-package-plus"
								class="min-h-11 min-w-0 justify-center whitespace-normal"
								:disabled="store.loading || selectableRows.length === 0"
								@click="pushAllVisibleToEasyParcel"
							>
								{{ t('shipmentArrangement.actions.pushAllEasyParcel') }}
							</UButton>
						</div>
						<ZTableToolbar
							v-model:selected-column-keys="selectedColumnKeys"
							desktop-columns
							:model-value="store.pageSize"
							class="w-full sm:w-auto"
							:page-size-options="options_page_size"
							:export-enabled="false"
							:column-options="columnOptions"
							@update:model-value="store.setPageSize"
						/>
					</div>
				</div>

				<div v-if="store.loading" data-testid="pending-loading" class="space-y-0 divide-y divide-default">
					<div v-for="row in 6" :key="row" class="grid grid-cols-2 gap-3 p-3 lg:grid-cols-6 lg:gap-4 lg:p-4">
						<USkeleton v-for="cell in 6" :key="cell" class="h-4 max-lg:nth-[n+3]:hidden" />
					</div>
				</div>

				<div v-else-if="store.rows.length === 0" data-testid="pending-empty" class="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
					<UIcon name="i-lucide-package-check" class="size-12 text-dimmed" />
					<div>
						<p class="font-semibold text-default">{{ t('shipmentArrangement.states.emptyTitle') }}</p>
						<p class="mt-1 text-sm text-muted">{{ t('shipmentArrangement.states.emptyDescription') }}</p>
					</div>
					<UButton
						data-testid="refresh-pending"
						color="neutral"
						variant="outline"
						icon="i-lucide-refresh-cw"
						class="min-h-11"
						:label="t('common.refresh')"
						@click="store.refreshPending"
					/>
				</div>

				<template v-else>
					<div v-if="desktop" class="hidden max-w-full overflow-x-auto lg:block">
						<UTable :data="[...store.rows]" :columns="visibleColumns" class="min-w-[64rem]" />
					</div>
					<div v-else class="lg:hidden">
						<div v-if="isEasyParcelConnected && selectableRows.length" class="border-b border-default px-3">
							<UCheckbox
								:model-value="allVisibleSelected"
								:indeterminate="!allVisibleSelected && selectedCount > 0"
								:label="t('shipmentArrangement.table.selectAll')"
								class="min-h-11 items-center"
								@update:model-value="(value) => toggleVisibleRows(selectableRows, value === true)"
							/>
						</div>
						<ul class="divide-y divide-default">
							<li v-for="row in store.rows" :key="row.fulfillment_id" class="flex items-start gap-3 p-3">
								<UCheckbox
									v-if="isEasyParcelConnected"
									:model-value="selectedFulfillmentIds.has(row.fulfillment_id)"
									:disabled="!isRowSelectable(row)"
									:aria-label="`${t('shipmentArrangement.table.selectRow')} ${row.order_no} · #${row.batch_no}`"
									class="min-h-11 min-w-11 shrink-0 items-center justify-center"
									:ui="{ base: 'relative after:absolute after:-inset-3' }"
									@update:model-value="(value) => toggleRow(row, value === true)"
								/>
								<div class="min-w-0 flex-1 space-y-1.5 wrap-anywhere">
									<div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
										<p class="text-sm font-semibold text-highlighted">{{ row.order_no }} · #{{ row.batch_no }}</p>
										<UBadge variant="soft" color="secondary" class="min-w-0 whitespace-normal">{{ row.shipping_method }}</UBadge>
									</div>
									<p class="text-sm text-default">{{ row.recipient }}</p>
									<p class="text-xs text-muted">{{ row.destination }}</p>
									<p class="text-xs text-muted">{{ getFormattedDate(new Date(row.ordered_at), 'dd-MM-yyyy HH:mm') }}</p>
								</div>
							</li>
						</ul>
					</div>
				</template>

				<div
					v-if="!store.loading && (store.rows.length > 0 || store.page > 1)"
					class="flex flex-col gap-3 border-t border-default px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"
				>
					<span v-if="store.rows.length">{{ t('shipmentArrangement.table.showing', { from: store.firstVisibleRow, to: store.lastVisibleRow, total: store.total }) }}</span>
					<ZPagination :page="store.page" :items-per-page="store.pageSize" :total="store.total" show-first show-last size="sm" @update:page="store.setPage" />
				</div>
			</section>

			<ShipmentArrangementImportPreviewModal
				v-model="previewOpen"
				:preview="store.preview"
				:eligible-count="store.eligibleCount"
				:apply-result="store.applyResult"
				:applying="store.applying"
				:error="store.applyFailure?.kind === 'request_failed' ? store.applyFailure.message : undefined"
				@apply="applyPreview"
				@dismiss="store.dismissImport"
			/>

			<FulfillmentCourierBookingModal
				v-model:open="bookingModalOpen"
				:targets="bookingTargets"
				@close="onBookingClose"
			/>
		</div>
		<template v-if="!desktop && isEasyParcelConnected && selectedCount > 0" #footer>
			<div class="border-t border-default bg-default p-2">
				<UButton
					data-testid="push-selected-easyparcel"
					color="primary"
					icon="i-lucide-truck"
					class="min-h-11 w-full justify-center whitespace-normal"
					:disabled="store.loading"
					@click="openSelectedBooking"
				>
					{{ t('shipmentArrangement.actions.pushSelected', { count: selectedCount }) }}
				</UButton>
			</div>
		</template>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { getFormattedDate } from 'yeppi-common';
import { options_page_size } from '~/utils/options';
import { getShipmentArrangementColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import type { CourierBookingTarget } from '~/utils/types/courier-booking';
import type { ShipmentArrangementListRow } from '~/utils/types/shipment-arrangement';

const SHIPMENT_ARRANGEMENT_COLUMN_LABELS = {
	order_no: 'shipmentArrangement.table.order',
	batch_no: 'shipmentArrangement.table.batch',
	ordered_at: 'shipmentArrangement.table.ordered',
	recipient: 'shipmentArrangement.table.recipient',
	destination: 'shipmentArrangement.table.destination',
	shipping_method: 'shipmentArrangement.table.shippingMethod',
} as const;

const store = useShipmentArrangementStore();
const { isConnected: isEasyParcelConnected } = useEasyParcelConnection();
const { t } = useI18n();
const fileInput = ref<HTMLInputElement>();
const selectedFulfillmentIds = ref(new Set<string>());
const bookingTargets = ref<CourierBookingTarget[]>([]);
const bookingModalOpen = ref(false);
const previewOpen = computed({
	get: () => store.preview != null,
	set: (open: boolean) => {
		if (!open) store.dismissImport();
	},
});

const desktop = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1024 });
const isRowSelectable = (row: ShipmentArrangementListRow) => !(row.booking_no ?? '').trim();
const selectableRows = computed(() => store.rows.filter(isRowSelectable));
const toggleVisibleRows = (rows: ShipmentArrangementListRow[], selected: boolean) => {
	const next = new Set(selectedFulfillmentIds.value);
	for (const row of rows.filter(isRowSelectable)) {
		if (selected) next.add(row.fulfillment_id);
		else next.delete(row.fulfillment_id);
	}
	selectedFulfillmentIds.value = next;
};
const toggleRow = (row: ShipmentArrangementListRow, selected: boolean) => toggleVisibleRows([row], selected);
const columns = computed(() => getShipmentArrangementColumns(t, isEasyParcelConnected.value
	? {
			selectedIds: selectedFulfillmentIds,
			isRowSelectable,
			onToggleRow: toggleRow,
			onToggleAllVisible: toggleVisibleRows,
		}
	: undefined));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SHIPMENT_ARRANGEMENT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);
const shippingMethodOptions = computed(() => [
	{ label: t('shipmentArrangement.filters.shippingMethod'), value: undefined },
	...store.activeShippingMethods.map((method) => ({ label: method.description, value: method.id })),
]);
const importFailureDescription = computed(() =>
	store.importFailure?.kind === 'unsupported_workbook'
		? t('shipmentArrangement.states.invalidFile')
		: store.importFailure?.message,
);
const selectedRowsOnPage = computed(() =>
	selectableRows.value.filter((row) => selectedFulfillmentIds.value.has(row.fulfillment_id)),
);
const selectedCount = computed(() => selectedRowsOnPage.value.length);
const allVisibleSelected = computed(() => selectedCount.value > 0 && selectedCount.value === selectableRows.value.length);
useHead({ title: () => t('shipmentArrangement.title') });

const pruneSelection = () => {
	const visibleIds = new Set(selectableRows.value.map((row) => row.fulfillment_id));
	selectedFulfillmentIds.value = new Set(
		[...selectedFulfillmentIds.value].filter((id) => visibleIds.has(id)),
	);
};

const openSelectedBooking = () => {
	bookingTargets.value = selectedRowsOnPage.value.map((row) => ({
		fulfillmentId: row.fulfillment_id,
		orderNo: row.order_no,
		batchNo: row.batch_no,
	}));
	bookingModalOpen.value = true;
};

const pushAllVisibleToEasyParcel = () => {
	bookingTargets.value = selectableRows.value.map((row) => ({
		fulfillmentId: row.fulfillment_id,
		orderNo: row.order_no,
		batchNo: row.batch_no,
	}));
	bookingModalOpen.value = true;
};

const onBookingClose = async (booked?: boolean) => {
	bookingModalOpen.value = false;
	if (!booked) return;
	selectedFulfillmentIds.value = new Set();
	await store.refreshPending();
};

const exportPending = async (): Promise<void> => {
	const outcome = await store.exportPending();
	if (outcome.status === 'completed') successNotification(t('shipmentArrangement.notifications.exported'));
	else failedNotification(outcome.failure.message);
};

const openFilePicker = (): void => {
	fileInput.value?.click();
};

const onFileSelected = async (event: Event): Promise<void> => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;

	const outcome = await store.previewWorkbook(file);
	if (outcome.status === 'completed') return;
	else if (outcome.failure.kind === 'unsupported_workbook') failedNotification(t('shipmentArrangement.states.invalidFile'));
	else failedNotification(outcome.failure.message);
};

const applyPreview = async (): Promise<void> => {
	const outcome = await store.applyPreview();
	if (outcome.status === 'failed') {
		failedNotification(outcome.failure.message);
	} else if (outcome.status === 'rejected') {
		failedNotification(t(outcome.failure.kind === 'missing_preview'
			? 'shipmentArrangement.states.uploadErrorTitle'
			: 'shipmentArrangement.preview.failedTitle'));
	} else if (outcome.status === 'completed' && outcome.result.failed > 0) {
		failedNotification(t('shipmentArrangement.notifications.partial', { updated: outcome.result.updated, failed: outcome.result.failed }));
	} else if (outcome.status === 'completed') {
		successNotification(t('shipmentArrangement.notifications.applied', { count: outcome.result.updated }));
	}
};

onMounted(async () => {
	await store.initialize();
	if (store.optionsFailure) failedNotification(store.optionsFailure.message);
});

watch(() => store.rows, () => {
	pruneSelection();
});

onBeforeUnmount(() => store.dispose());
</script>
